import { randomBytes } from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env - try multiple locations
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    console.log(`Loading .env from ${envPath}`);
    dotenv.config({ path: envPath });
} else {
    console.error(`Could not find .env at ${envPath}`);
}

async function main() {
    console.log('🔄 Starting Auth Fix Verification...');
    console.log('Environment Debug:');
    console.log('DEBUG_MODE:', process.env.DEBUG_MODE);
    console.log('NEXT_PUBLIC_FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Set' : 'Missing');

    // Dynamic import to ensure env is loaded first
    const { getDataProvider } = await import('../src/lib/data-provider');


    // Load Data Provider (will use one based on .env)
    const provider = await getDataProvider();

    const randomSuffix = randomBytes(4).toString('hex');
    const testEmailMix = `TestUser_${randomSuffix}@Example.COM`;
    const testEmailLower = testEmailMix.toLowerCase();
    const testPassword = 'SecurePassword123!';

    console.log(`\n📧 Testing with email: ${testEmailMix}`);
    console.log(`Expected normalized email: ${testEmailLower}`);

    try {
        // 1. Create User with Mixed Case Email
        console.log('\n1. Creating User with mixed-case email...');
        const user = await provider.createUser({
            name: 'Verification User',
            email: testEmailMix,
            isAdmin: false,
            password: testPassword,
            isGoogleAccount: false
        });

        console.log(`✅ User created. ID: ${user.id}`);
        console.log(`   Stored Email: "${user.email}"`);

        if (user.email === testEmailLower) {
            console.log('   ✅ PASS: Stored email is lowercased.');
        } else {
            console.error('   ❌ FAIL: Stored email is NOT lowercased.');
            process.exit(1);
        }

        // 2. Retrieve User by Lowercase Email
        console.log('\n2. Retrieving User by lowercase email...');
        const retrievedLower = await provider.getUserByEmail(testEmailLower);
        if (retrievedLower && retrievedLower.id === user.id) {
            console.log('   ✅ PASS: Retrieved successfully.');
        } else {
            console.error('   ❌ FAIL: Could not retrieve by lowercase email.');
            // Don't exit yet, try next case
        }

        // 3. Retrieve User by Mixed Case Email
        console.log('\n3. Retrieving User by mixed-case email...');
        const retrievedMix = await provider.getUserByEmail(testEmailMix);
        if (retrievedMix && retrievedMix.id === user.id) {
            console.log('   ✅ PASS: Retrieved successfully (provider logic handles normalization).');
        } else {
            console.error('   ❌ FAIL: Could not retrieve by mixed-case email.');
        }

        // 4. Validate Credentials with Mixed Case Email
        console.log('\n4. Validating Credentials with mixed-case email...');
        const validatedUser = await provider.validateCredentials(testEmailMix, testPassword);
        if (validatedUser && validatedUser.id === user.id) {
            console.log('   ✅ PASS: Credentials validated successfully.');
        } else {
            console.error('   ❌ FAIL: Credentials validation failed.');
        }

        // Cleanup
        console.log('\n🧹 Cleaning up...');
        await provider.deleteUser(user.id);
        console.log('✅ User deleted.');

        console.log('\n🎉 Verification Complete!');

    } catch (error) {
        console.error('\n❌ Verification Failed with Error:', error);
        process.exit(1);
    }
}

main();
