import 'dotenv/config';
import { getDataProvider } from '../src/lib/data-provider';
import { pbkdf2Sync, randomBytes } from 'node:crypto';

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error('Usage: npx tsx scripts/reset-password.ts <email> <new-password>');
        process.exit(1);
    }

    const [email, newPassword] = args;

    if (!email || !newPassword) {
        console.error('Email and new password are required.');
        process.exit(1);
    }

    console.log(`Resetting password for user: ${email}`);

    try {
        const provider = await getDataProvider();
        const user = await provider.getUserByEmail(email);

        if (!user) {
            console.error(`User with email ${email} not found.`);
            process.exit(1);
        }

        // We need to hash the password manually here if the provider's updateUserPassword 
        // expects a hash. Let's check SqlProvider implementation again.
        // SqlProvider.updateUserPassword takes `newHash` and saves it directly.
        // FirebaseProvider.updateUserPassword takes `newHash` and saves it directly.
        // So we must hash it here using the SAME logic as the providers.

        // Wait, the providers implement `hashPassword` privately. 
        // We should probably expose a helper or duplicate the logic here to be safe, 
        // or rely on a public method if one existed.
        // Since `hashPassword` is private in providers, I will duplicate the logic here 
        // to ensure it matches:
        // const salt = randomBytes(16).toString('hex');
        // const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        // return `${salt}:${hash}`;

        const salt = randomBytes(16).toString('hex');
        const hash = pbkdf2Sync(newPassword, salt, 1000, 64, 'sha512').toString('hex');
        const passwordHash = `${salt}:${hash}`;

        await provider.updateUserPassword(user.id, passwordHash);

        console.log(`Password for user ${email} (ID: ${user.id}) has been updated successfully.`);

    } catch (error) {
        console.error('Error resetting password:', error);
        process.exit(1);
    }
}

main().catch(console.error);
