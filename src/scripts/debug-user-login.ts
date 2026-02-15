import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { pbkdf2Sync } from 'node:crypto';

const dbPath = process.env.SQLITE_PATH || './db';
const dbFile = path.join(dbPath, 'ticketto.db');

const db = new Database(dbFile);
const email = 'dlightplayroom@gmail.com';
const row = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) as any;

if (row) {
    console.log('User found:', row);

    // Verify "ChangeMe123!"
    const storedHash = row.passwordHash;
    const [salt, hash] = storedHash.split(':');
    const verifyHash = pbkdf2Sync('ChangeMe123!', salt, 1000, 64, 'sha512').toString('hex');

    if (hash === verifyHash) {
        console.log('✅ Password IS "ChangeMe123!"');
    } else {
        console.log('❌ Password is NOT "ChangeMe123!"');
    }
} else {
    console.log('User NOT found.');
}
