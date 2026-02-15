import { IDataProvider } from './interface';
import { FirebaseProvider } from './firebase-provider';
import { SQLiteProvider } from './sqlite-provider';
import { MySQLProvider } from './mysql-provider';

let dataProviderInstance: IDataProvider | null = null;

export async function getDataProvider(): Promise<IDataProvider> {
    if (dataProviderInstance) return dataProviderInstance;

    // Support legacy DEBUG_MODE for backward compatibility if DATABASE_MODE not set
    const debugMode = process.env.DEBUG_MODE === 'true';
    const dbMode = process.env.DATABASE_MODE || (debugMode ? 'firebase' : 'localsql');

    console.log(`🔌 Initializing Data Provider. Mode: ${dbMode}`);

    switch (dbMode) {
        case 'firebase':
            console.log('🐞 Allocating FIREBASE Data Provider');
            dataProviderInstance = new FirebaseProvider();
            break;
        case 'mysql':
            console.log('🐬 Allocating MySQL Data Provider');
            dataProviderInstance = new MySQLProvider();
            break;
        case 'localsql':
        default:
            console.log('💾 Allocating SQLite Data Provider');
            dataProviderInstance = new SQLiteProvider();
            break;
    }

    return dataProviderInstance!;
}
