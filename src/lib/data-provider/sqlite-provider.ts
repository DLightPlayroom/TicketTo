import Database from 'better-sqlite3';
import { IDataProvider } from './interface';
import {
    CreateGameInput,
    CreateTicketInput,
    CreateUserInput,
    Game,
    Place,
    Ticket,
    TicketStatus,
    User,
    Tool,
    CreateToolInput,
    UpdateUserInput,
    UpdateGameInput,
    UpdateTicketInput
} from './types';
import { pbkdf2Sync, randomBytes, randomUUID } from 'node:crypto';
import * as path from 'path';
import * as fs from 'fs';

export class SQLiteProvider implements IDataProvider {
    private db: Database.Database;

    constructor() {
        const dbPath = process.env.SQLITE_PATH || './db';
        const dbFile = path.join(dbPath, 'ticketto.db');

        // Ensure directory exists
        if (!fs.existsSync(dbPath)) {
            fs.mkdirSync(dbPath, { recursive: true });
        }

        this.db = new Database(dbFile);
        this.initializeSchema();
    }

    private initializeSchema() {
        this.db.exec(`
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

            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(userId);
            CREATE INDEX IF NOT EXISTS idx_tickets_game ON tickets(gameId);
            CREATE INDEX IF NOT EXISTS idx_tools_place ON tools(placeId);
        `);
    }

    private hashPassword(password: string): string {
        const salt = randomBytes(16).toString('hex');
        const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return `${salt}:${hash}`;
    }

    private verifyPassword(password: string, storedHash: string): boolean {
        const [salt, hash] = storedHash.split(':');
        if (!salt || !hash) return false;
        const verifyHash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return hash === verifyHash;
    }

    // --- User Management ---

    async getUserByEmail(email: string): Promise<User | null> {
        const row = this.db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)')
            .get(email) as any;

        if (!row) return null;

        const places = this.db.prepare(`
            SELECT p.* FROM places p
            INNER JOIN user_places up ON p.id = up.place_id
            WHERE up.user_id = ?
        `).all(row.id) as Place[];

        return {
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            isAdmin: Boolean(row.isAdmin),
            places: places,
            createdAt: new Date(row.createdAt)
        };
    }

    async getUserById(id: string): Promise<User | null> {
        const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;

        if (!row) return null;

        const places = this.db.prepare(`
            SELECT p.* FROM places p
            INNER JOIN user_places up ON p.id = up.place_id
            WHERE up.user_id = ?
        `).all(row.id) as Place[];

        return {
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            isAdmin: Boolean(row.isAdmin),
            places: places,
            createdAt: new Date(row.createdAt)
        };
    }

    async createUser(input: CreateUserInput): Promise<User> {
        const id = randomUUID();
        const passwordHash = input.password ? this.hashPassword(input.password) : this.hashPassword(randomBytes(8).toString('hex'));
        const now = new Date().toISOString();

        this.db.prepare(`
            INSERT INTO users (id, name, email, phone, isAdmin, passwordHash, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, input.name, input.email.toLowerCase(), input.phone || '', input.isAdmin ? 1 : 0, passwordHash, now);

        // Add place associations
        if (input.placeIds && input.placeIds.length > 0) {
            const insertPlace = this.db.prepare('INSERT INTO user_places (user_id, place_id) VALUES (?, ?)');
            for (const placeId of input.placeIds) {
                insertPlace.run(id, placeId);
            }
        }

        return (await this.getUserById(id))!;
    }

    async updateUser(id: string, updates: UpdateUserInput): Promise<void> {
        const sets: string[] = [];
        const values: any[] = [];

        if (updates.name !== undefined) {
            sets.push('name = ?');
            values.push(updates.name);
        }
        if (updates.email !== undefined) {
            sets.push('email = ?');
            values.push(updates.email.toLowerCase());
        }
        if (updates.phone !== undefined) {
            sets.push('phone = ?');
            values.push(updates.phone);
        }
        if (updates.isAdmin !== undefined) {
            sets.push('isAdmin = ?');
            values.push(updates.isAdmin ? 1 : 0);
        }

        if (sets.length > 0) {
            values.push(id);
            this.db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...values);
        }
    }

    async deleteUser(id: string): Promise<void> {
        this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
    }

    async updateUserPassword(userId: string, newPassword: string): Promise<void> {
        const hash = this.hashPassword(newPassword);
        this.db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(hash, userId);
    }

    async addPlaceToUser(userId: string, placeId: string): Promise<void> {
        this.db.prepare('INSERT OR IGNORE INTO user_places (user_id, place_id) VALUES (?, ?)').run(userId, placeId);
    }

    async removePlaceFromUser(userId: string, placeId: string): Promise<void> {
        this.db.prepare('DELETE FROM user_places WHERE user_id = ? AND place_id = ?').run(userId, placeId);
    }

    async getUsers(): Promise<User[]> {
        const rows = this.db.prepare('SELECT * FROM users').all() as any[];
        return Promise.all(rows.map(row => this.getUserById(row.id).then(u => u!)));
    }

    async validateCredentials(email: string, passwordPlain: string): Promise<User | null> {
        const row = this.db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)')
            .get(email) as any;

        if (!row || !row.passwordHash) return null;

        const isValid = this.verifyPassword(passwordPlain, row.passwordHash);
        return isValid ? this.getUserById(row.id) : null;
    }

    // --- Place Management ---

    async getPlaces(): Promise<Place[]> {
        return this.db.prepare('SELECT * FROM places').all() as Place[];
    }

    async createPlace(name: string, address?: string): Promise<Place> {
        const id = randomUUID();
        this.db.prepare('INSERT INTO places (id, name, address) VALUES (?, ?, ?)').run(id, name, address || null);
        return { id, name, address };
    }

    async updatePlace(id: string, name: string, address?: string): Promise<void> {
        this.db.prepare('UPDATE places SET name = ?, address = ? WHERE id = ?').run(name, address || null, id);
    }

    async deletePlace(id: string): Promise<void> {
        this.db.prepare('DELETE FROM places WHERE id = ?').run(id);
    }

    // --- Game Management ---

    async getGames(): Promise<Game[]> {
        return this.db.prepare('SELECT * FROM games').all().map((row: any) => ({
            id: row.id,
            name: row.name,
            trelloListId: row.trelloListId,
            trelloListMap: row.trelloListMap ? JSON.parse(row.trelloListMap) : undefined
        }));
    }

    async createGame(input: CreateGameInput): Promise<Game> {
        const id = randomUUID();
        const trelloListMap = input.trelloListMap ? JSON.stringify(input.trelloListMap) : null;
        this.db.prepare('INSERT INTO games (id, name, trelloListId, trelloListMap) VALUES (?, ?, ?, ?)')
            .run(id, input.name, input.trelloListId || null, trelloListMap);
        return {
            id,
            name: input.name,
            trelloListId: input.trelloListId,
            trelloListMap: input.trelloListMap
        };
    }

    async updateGame(id: string, updates: UpdateGameInput): Promise<void> {
        const sets: string[] = [];
        const values: any[] = [];

        if (updates.name !== undefined) {
            sets.push('name = ?');
            values.push(updates.name);
        }
        if (updates.trelloListId !== undefined) {
            sets.push('trelloListId = ?');
            values.push(updates.trelloListId || null);
        }
        if (updates.trelloListMap !== undefined) {
            sets.push('trelloListMap = ?');
            values.push(updates.trelloListMap ? JSON.stringify(updates.trelloListMap) : null);
        }

        if (sets.length > 0) {
            values.push(id);
            this.db.prepare(`UPDATE games SET ${sets.join(', ')} WHERE id = ?`).run(...values);
        }
    }

    async deleteGame(id: string): Promise<void> {
        this.db.prepare('DELETE FROM games WHERE id = ?').run(id);
    }

    async getGameById(id: string): Promise<Game | null> {
        const row = this.db.prepare('SELECT * FROM games WHERE id = ?').get(id) as any;
        if (!row) return null;
        return {
            id: row.id,
            name: row.name,
            trelloListId: row.trelloListId,
            trelloListMap: row.trelloListMap ? JSON.parse(row.trelloListMap) : undefined
        };
    }

    // --- Tool Management ---

    async getToolsByPlace(placeId: string): Promise<Tool[]> {
        return this.db.prepare('SELECT * FROM tools WHERE placeId = ?').all(placeId).map((row: any) => ({
            id: row.id,
            placeId: row.placeId,
            name: row.name,
            type: row.type,
            parameters: row.parameters,
            createdAt: new Date(row.createdAt)
        }));
    }

    async createTool(input: CreateToolInput): Promise<Tool> {
        const now = new Date().toISOString();
        this.db.prepare('INSERT INTO tools (id, placeId, name, type, parameters, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
            .run(input.id, input.placeId, input.name, input.type, input.parameters || null, now);
        return {
            id: input.id,
            placeId: input.placeId,
            name: input.name,
            type: input.type,
            parameters: input.parameters,
            createdAt: new Date(now)
        };
    }

    async updateTool(placeId: string, id: string, updates: Partial<Pick<Tool, 'name' | 'type' | 'parameters' | 'id'>>): Promise<void> {
        const sets: string[] = [];
        const values: any[] = [];

        if (updates.name !== undefined) {
            sets.push('name = ?');
            values.push(updates.name);
        }
        if (updates.type !== undefined) {
            sets.push('type = ?');
            values.push(updates.type);
        }
        if (updates.parameters !== undefined) {
            sets.push('parameters = ?');
            values.push(updates.parameters);
        }
        if (updates.id !== undefined) {
            sets.push('id = ?');
            values.push(updates.id);
        }

        if (sets.length > 0) {
            values.push(id);
            this.db.prepare(`UPDATE tools SET ${sets.join(', ')} WHERE id = ?`).run(...values);
        }
    }

    async deleteTool(placeId: string, id: string): Promise<void> {
        this.db.prepare('DELETE FROM tools WHERE id = ?').run(id);
    }

    // --- Ticket Management ---

    async createTicket(input: CreateTicketInput): Promise<Ticket> {
        const id = randomUUID();
        const now = new Date().toISOString();
        this.db.prepare(`
            INSERT INTO tickets (id, userId, gameId, title, description, status, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, input.userId, input.gameId, input.title, input.description, 'NEW', now);

        return {
            id,
            userId: input.userId,
            gameId: input.gameId,
            title: input.title,
            description: input.description,
            status: 'NEW',
            createdAt: new Date(now)
        };
    }

    async getTicketById(id: string): Promise<Ticket | null> {
        const row = this.db.prepare('SELECT * FROM tickets WHERE id = ?').get(id) as any;
        if (!row) return null;
        return {
            id: row.id,
            userId: row.userId,
            gameId: row.gameId,
            title: row.title,
            description: row.description,
            status: row.status,
            trelloCardId: row.trelloCardId,
            trelloCardUrl: row.trelloCardUrl,
            createdAt: new Date(row.createdAt)
        };
    }

    async updateTicket(id: string, updates: Partial<Pick<Ticket, 'trelloCardId' | 'trelloCardUrl' | 'status'>>): Promise<void> {
        const sets: string[] = [];
        const values: any[] = [];

        if (updates.trelloCardId !== undefined) {
            sets.push('trelloCardId = ?');
            values.push(updates.trelloCardId);
        }
        if (updates.trelloCardUrl !== undefined) {
            sets.push('trelloCardUrl = ?');
            values.push(updates.trelloCardUrl);
        }
        if (updates.status !== undefined) {
            sets.push('status = ?');
            values.push(updates.status);
        }

        if (sets.length > 0) {
            values.push(id);
            this.db.prepare(`UPDATE tickets SET ${sets.join(', ')} WHERE id = ?`).run(...values);
        }
    }

    async updateTicketByUser(id: string, userId: string, updates: UpdateTicketInput): Promise<void> {
        const ticket = await this.getTicketById(id);
        if (!ticket) throw new Error('Ticket not found');
        if (ticket.userId !== userId) throw new Error('Unauthorized');

        const sets: string[] = [];
        const values: any[] = [];

        if (updates.title !== undefined) {
            sets.push('title = ?');
            values.push(updates.title);
        }
        if (updates.description !== undefined) {
            sets.push('description = ?');
            values.push(updates.description);
        }

        if (sets.length > 0) {
            values.push(id);
            this.db.prepare(`UPDATE tickets SET ${sets.join(', ')} WHERE id = ?`).run(...values);
        }
    }

    async deleteTicketByUser(id: string, userId: string): Promise<void> {
        const ticket = await this.getTicketById(id);
        if (!ticket) throw new Error('Ticket not found');
        if (ticket.userId !== userId) throw new Error('Unauthorized');
        this.db.prepare('DELETE FROM tickets WHERE id = ?').run(id);
    }

    async deleteTicket(id: string): Promise<void> {
        this.db.prepare('DELETE FROM tickets WHERE id = ?').run(id);
    }

    async getTicketsByUser(userId: string): Promise<Ticket[]> {
        return this.db.prepare('SELECT * FROM tickets WHERE userId = ? ORDER BY createdAt DESC')
            .all(userId).map((row: any) => ({
                id: row.id,
                userId: row.userId,
                gameId: row.gameId,
                title: row.title,
                description: row.description,
                status: row.status,
                trelloCardId: row.trelloCardId,
                trelloCardUrl: row.trelloCardUrl,
                createdAt: new Date(row.createdAt)
            }));
    }

    async getAllTickets(): Promise<Ticket[]> {
        return this.db.prepare('SELECT * FROM tickets ORDER BY createdAt DESC')
            .all().map((row: any) => ({
                id: row.id,
                userId: row.userId,
                gameId: row.gameId,
                title: row.title,
                description: row.description,
                status: row.status,
                trelloCardId: row.trelloCardId,
                trelloCardUrl: row.trelloCardUrl,
                createdAt: new Date(row.createdAt)
            }));
    }
}
