import { RxDbProvider } from '../lib/data-provider/rxdb-provider';

async function createAdmin() {
    console.log('🔧 Creating admin user...\n');

    const provider = new RxDbProvider();

    try {
        // Create admin user
        const admin = await provider.createUser({
            name: 'Tibor Father',
            email: 'tibi.father@gmail.com',
            password: 'ChangeMe123!',
            isAdmin: true,
            phone: ''
        });

        console.log('✅ Admin user created successfully!');
        console.log('\n📧 Email:', admin.email);
        console.log('🔑 Password: ChangeMe123!');
        console.log('👑 Admin: Yes');
        console.log('\n💡 You can now log in with these credentials.');
        console.log('⚠️  Remember to change your password after first login!');

    } catch (error: any) {
        if (error.message.includes('duplicate')) {
            console.log('ℹ️  Admin user already exists!');
            console.log('Email: tibi.father@gmail.com');
            console.log('Password: ChangeMe123!');
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

createAdmin();
