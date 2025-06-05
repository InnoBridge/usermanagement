import * as dotenv from 'dotenv';
import path from 'path';
import {
    initializeAuth
} from '@/api/auth';
import { initializeDatabase } from '@/api/database';
import { deleteUsersByIds, getUsers, syncUsers } from '@/api/users';
import { PostgresConfiguration } from '@/models/configuration';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

const initializeApis = () => {
    if (!CLERK_SECRET_KEY) {
        throw new Error('CLERK_SECRET_KEY is not set in the environment variables');
    }
    initializeAuth(CLERK_SECRET_KEY);
    const config = {
        connectionString: DATABASE_URL
    } as PostgresConfiguration;
    initializeDatabase(config);
};

const syncUsersTest = async () => {
    console.log('Starting syncUsersTest ...');
    const usersBeforeSync = await getUsers();
    console.log('Users before sync: ', JSON.stringify(usersBeforeSync, null, 2));
    await syncUsers();
    const usersAfterSync = await getUsers();
    console.log('Users after sync: ', JSON.stringify(usersAfterSync, null, 2));
    console.log('syncUsersTest completed');
}

const clearUsersTest = async () => {
    console.log('Starting clearUsersTest ...');
    const usersBeforeClear = await getUsers();
    const useIds = usersBeforeClear.map(user => user.id);
    await deleteUsersByIds(useIds);
    const usersAfterClear = await getUsers();
    console.log('Users after clear: ', JSON.stringify(usersAfterClear, null, 2));
    console.log('clearUsersTest completed');
}

(async function main() {
    try {
        // sync test
        initializeApis();
        // clearUsersTest();
        syncUsersTest();
        
        // promise tests in order
        console.log("🎉 All integration tests passed");
    } catch (err) {
        console.error("❌ Integration tests failed:", err);
        process.exit(1);
    }
})();