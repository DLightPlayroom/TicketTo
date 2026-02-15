import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { pbkdf2Sync, randomBytes } from 'node:crypto';

const dbPath = process.env.SQLITE_PATH || './db';
const dbFile = path.join(dbPath, 'ticketto.db');

if (!fs.existsSync(dbFile)) {
    console.error('Database file not found!');
    process.exit(1);
}

const db = new Database(dbFile);

const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('Usage: npx ts-node src/scripts/utility-reset-password.ts <email> <new_password>');
    process.exit(1);
}

const [email, newPassword] = args;

function hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) as any;

if (!user) {
    console.error(`User with email ${email} not found.`);
    process.exit(1);
}

const newHash = hashPassword(newPassword);
db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(newHash, user.id);

console.log(`✅ Password for ${email} has been reset successfully.`);
