import 'dotenv/config';
import { getDataProvider } from '../src/lib/data-provider';

async function main() {
    const provider = await getDataProvider();

    const adminEmail = 'admin@example.com';
    const existing = await provider.getUserByEmail(adminEmail);

    if (existing) {
        console.log('Admin already exists:', existing);
        return;
    }

    const admin = await provider.createUser({
        name: 'Admin User',
        email: adminEmail,
        isAdmin: true,
        password: 'password123', // Initial password
    });

    console.log('Created Admin User:', admin);
}

main().catch(console.error);
