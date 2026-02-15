import { SQLiteProvider } from '../lib/data-provider/sqlite-provider';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

async function checkDatabase() {
    console.log('🔍 Checking SQLite database contents...\n');

    // Initialize provider
    const provider = new SQLiteProvider();

    try {
        // Check Users
        const users = await provider.getUsers();
        console.log(`📊 Total Users: ${users.length}`);
        if (users.length > 0) {
            console.log('  Users:');
            users.forEach(u => {
                console.log(`    - ${u.email} (${u.isAdmin ? 'Admin' : 'User'}) - ID: ${u.id}`);
            });
        } else {
            console.log('  (No users found)');
        }

        // Check Places
        const places = await provider.getPlaces();
        console.log(`\n📊 Total Places: ${places.length}`);
        if (places.length > 0) {
            places.forEach(p => console.log(`    - ${p.name} (${p.id})`));
        }

        // Check Games
        const games = await provider.getGames();
        console.log(`\n📊 Total Games: ${games.length}`);
        if (games.length > 0) {
            games.forEach(g => console.log(`    - ${g.name} (${g.id})`));
        }

        // Check Tickets
        const tickets = await provider.getAllTickets();
        console.log(`\n📊 Total Tickets: ${tickets.length}`);
        if (tickets.length > 0) {
            tickets.forEach(t => console.log(`    - ${t.title} (${t.status})`));
        } else {
            console.log('    (No tickets found)');
        }

    } catch (error) {
        console.error('❌ Error checking database:', error);
    }
}

checkDatabase().catch(console.error);
