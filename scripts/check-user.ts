import 'dotenv/config';
import { getDataProvider } from '../src/lib/data-provider';

async function main() {
    const provider = await getDataProvider();
    const email = 'tibi.father@gmail.com';

    console.log(`Checking user: ${email}`);
    const user = await provider.getUserByEmail(email);

    if (user) {
        console.log('User found:', JSON.stringify(user, null, 2));
    } else {
        console.log('User NOT found in database.');
    }
}

main().catch(console.error);
