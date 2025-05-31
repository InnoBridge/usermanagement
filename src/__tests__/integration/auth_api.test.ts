import * as dotenv from 'dotenv';
import path from 'path';
import {
    initializeAuth,
    getUserCount,
    getUserList,
} from '@/api/auth';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

const initializeClient = () => {
    if (!CLERK_SECRET_KEY) {
        throw new Error('CLERK_SECRET_KEY is not set in the environment variables');
    }
    initializeAuth(CLERK_SECRET_KEY);
}

const getUserCountTest = async () => {
    console.log('Starting getUserCountTest ...');
    const usersCount = await getUserCount();
    console.log(`Total users in Clerk: ${usersCount}`);
    console.log('getUserCountTest completed');
};

const getUserListTest = async () => {
    console.log('Starting getUserListTest ...');
    const usersList = await getUserList(10, 0, 0);
    console.log(`User List: ${JSON.stringify(usersList, null, 2)}`);
    console.log('getUserListTest completed');
};

(async function main() {
    try {
        // sync test
        initializeClient();

        // promise tests in order
        await getUserCountTest();
        await getUserListTest();

        console.log("🎉 All integration tests passed");
    } catch (err) {
        console.error("❌ Integration tests failed:", err);
        process.exit(1);
    }
})();