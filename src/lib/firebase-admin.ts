
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// We need to use service account credentials or rely on default credentials (e.g. in Cloud Functions)
// For local dev, we might not have a service account json easily available unless provided in .env
// We can use basic env vars if they are set, or try to construct a cert object.

if (!admin.apps.length) {
    try {
        // Try to parse service account from environment variable if available
        // This is a common pattern: FIREBASE_SERVICE_ACCOUNT containing the JSON string
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
            : undefined;

        if (serviceAccount) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            // Fallback: This might fail if no default credentials are found
            // But let's try initializing without specific creds (works in some GCP envs)
            // Or we just don't init and let it fail later if used.
            console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT not found. Firebase Admin not initialized.');
        }
    } catch (error) {
        console.error('Failed to initialize Firebase Admin:', error);
    }
}

export const firebaseAdmin = admin;
export const authAdmin = admin.apps.length ? admin.auth() : null;
