import * as dotenv from 'dotenv';
import path from 'path';
import { ClerkClient, createClerkClient } from '@clerk/backend'

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

const initializeClerkClient = () => {
    if (!CLERK_SECRET_KEY) {
        throw new Error('CLERK_SECRET_KEY is not set in the environment variables');
    }
    return createClerkClient({ secretKey: CLERK_SECRET_KEY });
}

const runTest = async (client: ClerkClient) => {
    console.log('Starting tests...');
    const usersCount = await client.users.getCount();
    console.log(`Total users in Clerk: ${usersCount}`);
 

        // const userList = await client.users.getUserList(
        //     { limit: 10, offset: 0 }
        // );
        // console.log(`User List: ${JSON.stringify(userList, null, 2)}`);
    
        const pageSize = 1;
        let offset = 0;
        let keepPaging = true;

        while (keepPaging) {
            const { data: users } = await client.users.getUserList({
                limit: pageSize,
                offset,
                orderBy: '-updated_at',        // Newest updates first :contentReference[oaicite:2]{index=2}
            });

            for (const user of users) {
                console.log(user.id, user.emailAddresses[0]?.emailAddress, user.updatedAt);
                if (user.updatedAt <= 0) {
                    keepPaging = false;           // Reached already‐synced records
                    break;
                }
                // Upsert user record into your DB (idempotent) :contentReference[oaicite:3]{index=3}
            }

            offset += pageSize;
            if (users.length < pageSize) {
                keepPaging = false;             // No more pages
            }
        }

};


(async function main() {
    try {
        // sync test
        const clerkClient = initializeClerkClient();

        // promise tests in order
        await runTest(clerkClient);
 

        console.log("🎉 All integration tests passed");
    } catch (err) {
        console.error("❌ Integration tests failed:", err);
        process.exit(1);
    }
})();