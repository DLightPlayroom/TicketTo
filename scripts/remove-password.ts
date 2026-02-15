import 'dotenv/config';
import { db } from '../src/lib/firebase';
import { collection, query, where, getDocs, updateDoc, deleteField, doc } from 'firebase/firestore';

async function main() {
    console.log('Searching for user tibi.father@gmail.com...');
    const q = query(collection(db, 'users'), where('email', '==', 'tibi.father@gmail.com'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        console.log('User not found.');
        return;
    }

    const userDoc = snapshot.docs[0];
    console.log(`User found: ${userDoc.id}`);

    // Check if password exists
    if (userDoc.data().password) {
        console.log('Password field found. Removing...');
        await updateDoc(doc(db, 'users', userDoc.id), {
            password: deleteField()
        });
        console.log('Password removed successfully.');
    } else {
        console.log('No password field found on user.');
    }
}

main().catch(console.error);
