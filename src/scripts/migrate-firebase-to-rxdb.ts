// src/scripts/migrate-firebase-to-rxdb.ts

// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

// Set DEBUG_MODE to enable Firebase provider (but we won't use it - direct Firebase access instead)
process.env.DEBUG_MODE = 'true';

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { RxDbProvider } from '../lib/data-provider/rxdb-provider';

async function main() {
    console.log('🚀 Starting Firebase → RxDB Migration...\n');

    // Initialize Firebase directly with credentials
    const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };

    console.log('Firebase Config:', firebaseConfig.projectId); // Debug

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const rxdbProvider = new RxDbProvider();

    try {
        // 1. Migrate Users
        console.log('📦 Migrating Users...');
        const usersSnap = await getDocs(collection(db, 'users'));
        console.log(`Found ${usersSnap.size} users`);

        for (const userDoc of usersSnap.docs) {
            const userData = userDoc.data();
            try {
                await rxdbProvider.createUser({
                    name: userData.name,
                    email: userData.email,
                    phone: userData.phone || '',
                    isAdmin: userData.isAdmin,
                    password: 'ChangeMe123!', // Default password
                    placeIds: userData.places || []
                });
                console.log(`  ✅ Migrated user: ${userData.email}`);
            } catch (error: any) {
                console.error(`  ❌ Failed to migrate user ${userData.email}:`, error.message);
            }
        }

        // 2. Migrate Places
        console.log('\n📦 Migrating Places...');
        const placesSnap = await getDocs(collection(db, 'places'));
        console.log(`Found ${placesSnap.size} places`);

        for (const placeDoc of placesSnap.docs) {
            const placeData = placeDoc.data();
            try {
                await rxdbProvider.createPlace(placeData.name, placeData.address);
                console.log(`  ✅ Migrated place: ${placeData.name}`);
            } catch (error: any) {
                console.error(`  ❌ Failed to migrate place ${placeData.name}:`, error.message);
            }
        }

        // 3. Migrate Tools (subcollection structure)
        console.log('\n📦 Migrating Tools...');
        let toolCount = 0;
        for (const placeDoc of placesSnap.docs) {
            const toolsSnap = await getDocs(collection(db, 'places', placeDoc.id, 'tools'));
            for (const toolDoc of toolsSnap.docs) {
                const toolData = toolDoc.data();
                try {
                    await rxdbProvider.createTool({
                        id: toolDoc.id,
                        placeId: placeDoc.id,
                        name: toolData.name,
                        type: toolData.type,
                        parameters: toolData.parameters || {}
                    });
                    console.log(`  ✅ Migrated tool: ${toolData.name}`);
                    toolCount++;
                } catch (error: any) {
                    console.error(`  ❌ Failed to migrate tool ${toolData.name}:`, error.message);
                }
            }
        }
        console.log(`Total tools migrated: ${toolCount}`);

        // 4. Migrate Games
        console.log('\n📦 Migrating Games...');
        const gamesSnap = await getDocs(collection(db, 'games'));
        console.log(`Found ${gamesSnap.size} games`);

        for (const gameDoc of gamesSnap.docs) {
            const gameData = gameDoc.data();
            try {
                await rxdbProvider.createGame({
                    name: gameData.name,
                    trelloListId: gameData.trelloListId || ''
                });
                console.log(`  ✅ Migrated game: ${gameData.name}`);
            } catch (error: any) {
                console.error(`  ❌ Failed to migrate game ${gameData.name}:`, error.message);
            }
        }

        // 5. Migrate Tickets
        console.log('\n📦 Migrating Tickets...');
        const ticketsSnap = await getDocs(collection(db, 'tickets'));
        console.log(`Found ${ticketsSnap.size} tickets`);

        for (const ticketDoc of ticketsSnap.docs) {
            const ticketData = ticketDoc.data();
            try {
                await rxdbProvider.createTicket({
                    userId: ticketData.userId,
                    gameId: ticketData.gameId,
                    title: ticketData.title,
                    description: ticketData.description
                });
                console.log(`  ✅ Migrated ticket: ${ticketData.title}`);
            } catch (error: any) {
                console.error(`  ❌ Failed to migrate ticket ${ticketData.title}:`, error.message);
            }
        }

        console.log('\n🎉 Migration Complete!');
        console.log('\n⚠️  IMPORTANT: All users have default password "ChangeMe123!" - they should reset it.');

    } catch (error) {
        console.error('\n❌ Migration Failed:', error);
        process.exit(1);
    }
}

main();
