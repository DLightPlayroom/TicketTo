import { RxDbProvider } from '../lib/data-provider/rxdb-provider';

// Quick seed script - creates minimal data to get started
async function seed() {
    console.log('🌱  Seeding database with initial data...\n');

    const provider = new RxDbProvider();

    try {
        // Create admin user
        console.log('Creating admin user...');
        await provider.createUser({
            name: 'Admin',
            email: 'admin@ticketto.com',
            password: 'admin123',
            isAdmin: true,
            phone: ''
        });
        console.log('✅ Admin created: admin@ticketto.com / admin123');

        // Create tibi.father admin
        console.log('\nCreating tibi.father admin...');
        await provider.createUser({
            name: 'Tibor Father',
            email: 'tibi.father@gmail.com',
            password: 'admin123',
            isAdmin: true,
            phone: ''
        });
        console.log('✅ Admin created: tibi.father@gmail.com / admin123');

        console.log('\n🎉 Database seeded successfully!');
        console.log('\n📝 Login credentials:');
        console.log('  Email: admin@ticketto.com OR tibi.father@gmail.com');
        console.log('  Password: admin123');

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }

    process.exit(0);
}

seed();
