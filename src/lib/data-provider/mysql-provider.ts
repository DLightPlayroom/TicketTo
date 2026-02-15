import mysql from 'mysql2/promise';
import { IDataProvider } from './interface';
import {
    CreateGameInput,
    CreateTicketInput,
    CreateUserInput,
    Game,
    Place,
    Ticket,
    User,
    Tool,
    CreateToolInput,
    UpdateUserInput,
    UpdateGameInput,
    UpdateTicketInput
} from './types';
import { pbkdf2Sync, randomBytes, randomUUID } from 'node:crypto';

export class MySQLProvider implements IDataProvider {
    private pool: mysql.Pool;

    constructor() {
        this.pool = mysql.createPool({
            host: process.env.MYSQL_HOST || 'localhost',
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || '',
            database: process.env.MYSQL_DATABASE || 'ticketto',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        this.initializeSchema();
    }

    private async initializeSchema() {
        const connection = await this.pool.getConnection();
        try {
            await connection.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    phone VARCHAR(50),
                    isAdmin BOOLEAN NOT NULL DEFAULT 0,
                    passwordHash VARCHAR(255) NOT NULL,
                    createdAt DATETIME NOT NULL
                )
            `);

            await connection.query(`
                CREATE TABLE IF NOT EXISTS places (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    address TEXT
                )
            `);

            await connection.query(`
                CREATE TABLE IF NOT EXISTS user_places (
                    user_id VARCHAR(36) NOT NULL,
                    place_id VARCHAR(36) NOT NULL,
                    PRIMARY KEY (user_id, place_id),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
                )
            `);

            await connection.query(`
                CREATE TABLE IF NOT EXISTS tools (
                    id VARCHAR(36) PRIMARY KEY,
                    placeId VARCHAR(36) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    parameters TEXT,
                    createdAt DATETIME NOT NULL,
                    FOREIGN KEY (placeId) REFERENCES places(id) ON DELETE CASCADE
                )
            `);

            await connection.query(`
                CREATE TABLE IF NOT EXISTS games (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    trelloListId VARCHAR(255),
                    trelloListMap TEXT
                )
            `);

            await connection.query(`
                CREATE TABLE IF NOT EXISTS tickets (
                    id VARCHAR(36) PRIMARY KEY,
                    userId VARCHAR(36) NOT NULL,
                    gameId VARCHAR(36) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    description TEXT NOT NULL,
                    status VARCHAR(50) NOT NULL DEFAULT 'NEW',
                    trelloCardId VARCHAR(255),
                    trelloCardUrl VARCHAR(255),
                    createdAt DATETIME NOT NULL,
                    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE
                )
            `);

            // Check if indexes exist before creating them (MySQL doesn't support IF NOT EXISTS for indexes in older versions reliably, 
            // but in newer ones it does. A safe way is to catch the error or inspect checking tables).
            // For simplicity in this implementation, we'll try to create them and ignore specific errors if they exist, 
            // or rely on CREATE INDEX IF NOT EXISTS which is supported in MySQL 8.0+.
            // Assuming MySQL 8.0+ for modern development.
            // Note: INT(1) for BOOLEAN is standard in MySQL.

            try { await connection.query('CREATE INDEX idx_users_email ON users(email)'); } catch (e) { }
            try { await connection.query('CREATE INDEX idx_tickets_user ON tickets(userId)'); } catch (e) { }
            try { await connection.query('CREATE INDEX idx_tickets_game ON tickets(gameId)'); } catch (e) { }
            try { await connection.query('CREATE INDEX idx_tools_place ON tools(placeId)'); } catch (e) { }

        } finally {
            connection.release();
        }
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
        const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
        const row = rows[0];

        if (!row) return null;

        const [placeRows] = await this.pool.query<mysql.RowDataPacket[]>(`
            SELECT p.* FROM places p
            INNER JOIN user_places up ON p.id = up.place_id
            WHERE up.user_id = ?
        `, [row.id]);

        return {
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            isAdmin: Boolean(row.isAdmin),
            places: placeRows as Place[],
            createdAt: new Date(row.createdAt)
        };
    }

    async getUserById(id: string): Promise<User | null> {
        const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM users WHERE id = ?', [id]);
        const row = rows[0];

        if (!row) return null;

        const [placeRows] = await this.pool.query<mysql.RowDataPacket[]>(`
            SELECT p.* FROM places p
            INNER JOIN user_places up ON p.id = up.place_id
            WHERE up.user_id = ?
        `, [row.id]);

        return {
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            isAdmin: Boolean(row.isAdmin),
            places: placeRows as Place[],
            createdAt: new Date(row.createdAt)
        };
    }

    async createUser(input: CreateUserInput): Promise<User> {
        const id = randomUUID();
        const passwordHash = input.password ? this.hashPassword(input.password) : this.hashPassword(randomBytes(8).toString('hex'));
        const now = new Date();

        await this.pool.query(`
            INSERT INTO users (id, name, email, phone, isAdmin, passwordHash, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [id, input.name, input.email.toLowerCase(), input.phone || '', input.isAdmin ? 1 : 0, passwordHash, now]);

        // Add place associations
        if (input.placeIds && input.placeIds.length > 0) {
            for (const placeId of input.placeIds) {
                await this.pool.query('INSERT INTO user_places (user_id, place_id) VALUES (?, ?)', [id, placeId]);
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
            await this.pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, values);
        }
    }

    async deleteUser(id: string): Promise<void> {
        await this.pool.query('DELETE FROM users WHERE id = ?', [id]);
    }

    async updateUserPassword(userId: string, newPassword: string): Promise<void> {
        const hash = this.hashPassword(newPassword);
        await this.pool.query('UPDATE users SET passwordHash = ? WHERE id = ?', [hash, userId]);
    }

    async addPlaceToUser(userId: string, placeId: string): Promise<void> {
        await this.pool.query('INSERT IGNORE INTO user_places (user_id, place_id) VALUES (?, ?)', [userId, placeId]);
    }

    async removePlaceFromUser(userId: string, placeId: string): Promise<void> {
        await this.pool.query('DELETE FROM user_places WHERE user_id = ? AND place_id = ?', [userId, placeId]);
    }

    async getUsers(): Promise<User[]> {
        const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM users');
        // This effectively does N+1 queries which is okay for small datasets but not ideal. 
        // For now, mirroring existing logic.
        return Promise.all(rows.map(row => this.getUserById(row.id).then(u => u!)));
    }

    async validateCredentials(email: string, passwordPlain: string): Promise<User | null> {
        const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
        const row = rows[0];

        if (!row || !row.passwordHash) return null;

        const isValid = this.verifyPassword(passwordPlain, row.passwordHash);
        return isValid ? this.getUserById(row.id) : null;
    }

    // --- Place Management ---

    async getPlaces(): Promise<Place[]> {
        const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM places');
        return rows as Place[];
    }

    async createPlace(name: string, address?: string): Promise<Place> {
        const id = randomUUID();
        await this.pool.query('INSERT INTO places (id, name, address) VALUES (?, ?, ?)', [id, name, address || null]);
        return { id, name, address };
    }

    async updatePlace(id: string, name: string, address?: string): Promise<void> {
        await this.pool.query('UPDATE places SET name = ?, address = ? WHERE id = ?', [name, address || null, id]);
    }

    async deletePlace(id: string): Promise<void> {
        await this.pool.query('DELETE FROM places WHERE id = ?', [id]);
    }

    // --- Game Management ---

    async getGames(): Promise<Game[]> {
        const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM games');
        return rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            trelloListId: row.trelloListId,
            trelloListMap: row.trelloListMap ? JSON.parse(row.trelloListMap) : undefined
        }));
    }

    async createGame(input: CreateGameInput): Promise<Game> {
        const id = randomUUID();
        const trelloListMap = input.trelloListMap ? JSON.stringify(input.trelloListMap) : null;
        await this.pool.query('INSERT INTO games (id, name, trelloListId, trelloListMap) VALUES (?, ?, ?, ?)',
            [id, input.name, input.trelloListId || null, trelloListMap]);
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
            await this.pool.query(`UPDATE games SET ${sets.join(', ')} WHERE id = ?`, values);
        }
    }

    async deleteGame(id: string): Promise<void> {
        await this.pool.query('DELETE FROM games WHERE id = ?', [id]);
    }

    async getGameById(id: string): Promise<Game | null> {
        const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM games WHERE id = ?', [id]);
        const row = rows[0];
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
        const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM tools WHERE placeId = ?', [placeId]);
        return rows.map((row: any) => ({
            id: row.id,
            placeId: row.placeId,
            name: row.name,
            type: row.type,
            parameters: row.parameters,
            createdAt: new Date(row.createdAt)
        }));
    }

    async createTool(input: CreateToolInput): Promise<Tool> {
        const now = new Date();
        await this.pool.query('INSERT INTO tools (id, placeId, name, type, parameters, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
            [input.id, input.placeId, input.name, input.type, input.parameters || null, now]);
        return {
            id: input.id,
            placeId: input.placeId,
            name: input.name,
            type: input.type,
            parameters: input.parameters,
            createdAt: now
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
            await this.pool.query(`UPDATE tools SET ${sets.join(', ')} WHERE id = ?`, values);
        }
    }

    async deleteTool(placeId: string, id: string): Promise<void> {
        await this.pool.query('DELETE FROM tools WHERE id = ?', [id]);
    }

    // --- Ticket Management ---

    async createTicket(input: CreateTicketInput): Promise<Ticket> {
        const id = randomUUID();
        const now = new Date();
        await this.pool.query(`
            INSERT INTO tickets (id, userId, gameId, title, description, status, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [id, input.userId, input.gameId, input.title, input.description, 'NEW', now]);

        return {
            id,
            userId: input.userId,
            gameId: input.gameId,
            title: input.title,
            description: input.description,
            status: 'NEW',
            createdAt: now
        };
    }

    async getTicketById(id: string): Promise<Ticket | null> {
        const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM tickets WHERE id = ?', [id]);
        const row = rows[0];
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
            await this.pool.query(`UPDATE tickets SET ${sets.join(', ')} WHERE id = ?`, values);
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
            await this.pool.query(`UPDATE tickets SET ${sets.join(', ')} WHERE id = ?`, values);
        }
    }

    async deleteTicketByUser(id: string, userId: string): Promise<void> {
        const ticket = await this.getTicketById(id);
        if (!ticket) throw new Error('Ticket not found');
        if (ticket.userId !== userId) throw new Error('Unauthorized');
        await this.pool.query('DELETE FROM tickets WHERE id = ?', [id]);
    }

    async deleteTicket(id: string): Promise<void> {
        await this.pool.query('DELETE FROM tickets WHERE id = ?', [id]);
    }

    async getTicketsByUser(userId: string): Promise<Ticket[]> {
        const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM tickets WHERE userId = ? ORDER BY createdAt DESC', [userId]);
        return rows.map((row: any) => ({
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
        const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM tickets ORDER BY createdAt DESC');
        return rows.map((row: any) => ({
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
