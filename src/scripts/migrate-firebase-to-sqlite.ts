import Database from 'better-sqlite3';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import * as path from 'path';
import * as fs from 'fs';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

function hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

async function main() {
    console.log('🚀 Starting Firebase → SQLite Migration (Preserving IDs)...\n');

    // 1. Initialize Firebase
    const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };

    if (!firebaseConfig.apiKey) {
        console.error('❌ Firebase config missing in .env or .env.local');
        process.exit(1);
    }

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // 2. Initialize SQLite
    const dbPath = process.env.SQLITE_PATH || './db';
    const dbFile = path.join(dbPath, 'ticketto.db');

    if (!fs.existsSync(dbPath)) {
        fs.mkdirSync(dbPath, { recursive: true });
    }

    const sqlite = new Database(dbFile);

    // Enable foreign keys
    sqlite.pragma('foreign_keys = ON');

    // Initialize Schema (Idempotent)
    console.log('📦 Initializing Schema...');
    sqlite.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            isAdmin INTEGER NOT NULL DEFAULT 0,
            passwordHash TEXT NOT NULL,
            createdAt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS places (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            address TEXT
        );

        CREATE TABLE IF NOT EXISTS user_places (
            user_id TEXT NOT NULL,
            place_id TEXT NOT NULL,
            PRIMARY KEY (user_id, place_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tools (
            id TEXT PRIMARY KEY,
            placeId TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            parameters TEXT,
            createdAt TEXT NOT NULL,
            FOREIGN KEY (placeId) REFERENCES places(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS games (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            trelloListId TEXT,
            trelloListMap TEXT
        );

        CREATE TABLE IF NOT EXISTS tickets (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            gameId TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'NEW',
            trelloCardId TEXT,
            trelloCardUrl TEXT,
            createdAt TEXT NOT NULL,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE
        );
    `);

    // Prepare Statements
    const insertUser = sqlite.prepare(`
        INSERT OR REPLACE INTO users (id, name, email, phone, isAdmin, passwordHash, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertPlace = sqlite.prepare(`
        INSERT OR REPLACE INTO places (id, name, address)
        VALUES (?, ?, ?)
    `);

    const insertUserPlace = sqlite.prepare(`
        INSERT OR IGNORE INTO user_places (user_id, place_id)
        VALUES (?, ?)
    `);

    const insertTool = sqlite.prepare(`
        INSERT OR REPLACE INTO tools (id, placeId, name, type, parameters, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertGame = sqlite.prepare(`
        INSERT OR REPLACE INTO games (id, name, trelloListId, trelloListMap)
        VALUES (?, ?, ?, ?)
    `);

    const insertTicket = sqlite.prepare(`
        INSERT OR REPLACE INTO tickets (id, userId, gameId, title, description, status, trelloCardId, trelloCardUrl, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 3. Migrate Data
    try {
        const defaultPasswordHash = hashPassword('ChangeMe123!');
        const now = new Date().toISOString();

        // --- Places ---
        console.log('\n📍 Migrating Places...');
        const placesSnap = await getDocs(collection(db, 'places'));
        let placeCount = 0;
        for (const doc of placesSnap.docs) {
            const data = doc.data();
            insertPlace.run(doc.id, data.name, data.address || null);
            console.log(`  ✅ Place: ${data.name} (${doc.id})`);
            placeCount++;

            // --- Tools (Subcollection of Places) ---
            const toolsSnap = await getDocs(collection(db, 'places', doc.id, 'tools'));
            for (const toolDoc of toolsSnap.docs) {
                const toolData = toolDoc.data();
                insertTool.run(
                    toolDoc.id,
                    doc.id,
                    toolData.name,
                    toolData.type,
                    toolData.parameters ? JSON.stringify(toolData.parameters) : null,
                    now
                );
                console.log(`    🛠 Tool: ${toolData.name}`);
            }
        }
        console.log(`  Total Places: ${placeCount}`);

        // --- Users ---
        console.log('\n👤 Migrating Users...');
        const usersSnap = await getDocs(collection(db, 'users'));
        let userCount = 0;
        for (const doc of usersSnap.docs) {
            const data = doc.data();
            // Check existing so we don't overwrite passwords if run multiple times?
            // Actually REPLACE will overwrite. We want that for full sync.
            // But if user already exists in SQLite (maybe manually created admin), 
            // we might want to keep their password? 
            // For now, let's assume valid migration overwrites everything.

            insertUser.run(
                doc.id,
                data.name,
                data.email.toLowerCase(),
                data.phone || null,
                data.isAdmin ? 1 : 0,
                defaultPasswordHash,
                data.createdAt?.toDate?.()?.toISOString() || now
            );
            console.log(`  ✅ User: ${data.email} (${doc.id})`);

            // Handle user_places
            if (data.places && Array.isArray(data.places)) {
                for (const placeId of data.places) {
                    // Check if place exists first to maintain FK constraint
                    const placeExists = sqlite.prepare('SELECT 1 FROM places WHERE id = ?').get(placeId);
                    if (placeExists) {
                        insertUserPlace.run(doc.id, placeId);
                    } else {
                        console.warn(`    ⚠️ Skipping invalid place reference: ${placeId}`);
                    }
                }
            }
            userCount++;
        }
        console.log(`  Total Users: ${userCount}`);

        // --- Games ---
        console.log('\n🎮 Migrating Games...');
        const gamesSnap = await getDocs(collection(db, 'games'));
        let gameCount = 0;
        for (const doc of gamesSnap.docs) {
            const data = doc.data();
            insertGame.run(
                doc.id,
                data.name,
                data.trelloListId || null,
                data.trelloListMap ? JSON.stringify(data.trelloListMap) : null
            );
            console.log(`  ✅ Game: ${data.name} (${doc.id})`);
            gameCount++;
        }
        console.log(`  Total Games: ${gameCount}`);

        // --- Tickets ---
        console.log('\n🎫 Migrating Tickets...');
        const ticketsSnap = await getDocs(collection(db, 'tickets'));
        let ticketCount = 0;
        for (const doc of ticketsSnap.docs) {
            const data = doc.data();

            // Validate FKs
            const userExists = sqlite.prepare('SELECT 1 FROM users WHERE id = ?').get(data.userId);
            const gameExists = sqlite.prepare('SELECT 1 FROM games WHERE id = ?').get(data.gameId);

            if (userExists && gameExists) {
                insertTicket.run(
                    doc.id,
                    data.userId,
                    data.gameId,
                    data.title,
                    data.description || '',
                    data.status || 'NEW',
                    data.trelloCardId || null,
                    data.trelloCardUrl || null,
                    data.createdAt?.toDate?.()?.toISOString() || now
                );
                console.log(`  ✅ Ticket: ${data.title} (${doc.id})`);
                ticketCount++;
            } else {
                console.warn(`  ⚠️ Skipping ticket ${doc.id} (Missing User or Game FK)`);
            }
        }
        console.log(`  Total Tickets: ${ticketCount}`);

        console.log('\n✨ Database Migration Complete!');

    } catch (error) {
        console.error('❌ Migration Error:', error);
    } finally {
        sqlite.close();
    }
}

main().catch(console.error);
