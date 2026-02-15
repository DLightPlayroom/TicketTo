import { RxDbProvider } from '../lib/data-provider/rxdb-provider';
import { CreateUserInput, CreateTicketInput, CreateGameInput } from '../lib/data-provider/types';

async function main() {
    console.log('🚧 Starting RxDB Verification Script...');
    console.log('⚠️  NOTE: If this script hangs or fails with DB9, stop your running "npm run dev" server to release the database lock.');

    // Optional: Use a separate DB name to avoid locks, but then you don't test the REAL data.
    // Uncomment next line to test on a separate isolated DB
    // process.env.RXDB_NAME = 'test_db_' + Date.now(); 

    try {
        const provider = new RxDbProvider();

        // 1. List Users
        console.log('\n--- 1. Listing Existing Users ---');
        const users = await provider.getUsers();
        console.log(`Found ${users.length} users.`);
        if (users.length > 0) {
            console.log('Sample User:', users[0].name, `(${users[0].email})`);
        }

        // 2. Create Test User
        console.log('\n--- 2. Creating Test User ---');
        const testUserEmail = `test_${Date.now()}@example.com`;
        const newUser = await provider.createUser({
            name: 'Test Runner User',
            email: testUserEmail,
            password: 'password123',
            isAdmin: false,
            phone: '555-0199'
        });
        console.log('✅ Created User:', newUser.id, newUser.email);

        // 3. Create Test Ticket
        console.log('\n--- 3. Creating Test Ticket ---');
        // Need a game first, lets see if one exists or create dummy
        const games = await provider.getGames();
        let gameId = games.length > 0 ? games[0].id : '';

        if (!gameId) {
            const newGame = await provider.createGame({ name: 'Test Game', trelloListId: 'dummy' });
            gameId = newGame.id;
            console.log('Created temporary game for ticket:', gameId);
        }

        const newTicket = await provider.createTicket({
            title: 'Automated Test Ticket',
            description: 'This ticket was created by the test script.',
            userId: newUser.id,
            gameId: gameId
        });
        console.log('✅ Created Ticket:', newTicket.id, newTicket.title);

        // 4. Verify Fetch
        console.log('\n--- 4. Verifying Data ---');
        const fetchedTicket = await provider.getTicketById(newTicket.id);
        if (fetchedTicket?.title === 'Automated Test Ticket') {
            console.log('✅ Ticket fetch verified!');
        } else {
            console.error('❌ Ticket fetch failed!');
        }

        // 5. Cleanup (Optional - comment out to keep data)
        console.log('\n--- 5. Cleanup ---');
        // Note: Delete method not explicitly in generic interface for all types, 
        // but let's assume we want to keep it to see in UI.
        console.log('Skipping cleanup so you can see data in dashboard.');
        console.log(`Login with: ${testUserEmail} / password123`);

        console.log('\n🎉 Test Complete! Press Ctrl+C to exit if it doesn\'t close automatically.');

    } catch (error) {
        console.error('\n❌ Test Failed:', error);
    }
}

main();
