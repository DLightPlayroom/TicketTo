// src/scripts/verify-migration.ts
import dotenv from 'dotenv';
dotenv.config();

import { RxDbProvider } from '../lib/data-provider/rxdb-provider';

async function main() {
    console.log('🔍 Verifying RxDB Migration...\n');

    const provider = new RxDbProvider();

    try {
        const users = await provider.getUsers();
        console.log(`✅ Users: ${users.length}`);
        if (users.length > 0) {
            console.log(`   Sample: ${users[0].name} (${users[0].email})`);
        }

        const places = await provider.getPlaces();
        console.log(`✅ Places: ${places.length}`);
        if (places.length > 0) {
            console.log(`   Sample: ${places[0].name}`);
        }

        const games = await provider.getGames();
        console.log(`✅ Games: ${games.length}`);
        if (games.length > 0) {
            console.log(`   Sample: ${games[0].name}`);
        }

        const tickets = await provider.getAllTickets();
        console.log(`✅ Tickets: ${tickets.length}`);
        if (tickets.length > 0) {
            console.log(`   Sample: ${tickets[0].title}`);
        }

        console.log('\n🎉 Migration verification complete!');

    } catch (error) {
        console.error('\n❌ Verification Failed:', error);
        process.exit(1);
    }
}

main();
