import 'dotenv/config';
import { getDataProvider } from '../src/lib/data-provider';

async function main() {
    console.log('🐞 Allocating FIREBASE Data Provider (Debug Mode)');
    const provider = await getDataProvider();
    const email = 'tibi.father@gmail.com';

    console.log(`Looking up user: ${email}`);
    const user = await provider.getUserByEmail(email);

    if (!user) {
        console.error('User not found!');
        process.exit(1);
    }

    console.log(`Found user: ${user.id} (${user.name})`);
    console.log(`Current Status: isAdmin=${user.isAdmin}`);

    if (user.isAdmin) {
        console.log('User is already admin.');
        return;
    }

    console.log('Updating user to admin...');
    await provider.updateUser(user.id, { isAdmin: true });

    const updatedUser = await provider.getUserById(user.id);
    console.log(`Updated Status: isAdmin=${updatedUser?.isAdmin}`);
}

main().catch(console.error);
