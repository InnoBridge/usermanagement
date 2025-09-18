import * as dotenv from 'dotenv';
import path from 'path';
import {
    initializeAuth
} from '@/api/auth';
import { initializeDatabase } from '@/api/database';
import { 
    deleteUsersByIds,
    deleteUserById,
    getUsers, 
    syncUsers, 
    getUsersByIds, 
    getUserById,
    getUserByUsername,
    getEmailAddressesByUserIds,
    getAddressesByUserIds
} from '@/api/users';
import { PostgresConfiguration } from '@/models/configuration';
import { user } from '@innobridge/shared';

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

const getUsersTest = async (): Promise<user.User[]> => {
    console.log('Starting getUsersTest ...');
    const users = await getUsers();
    // console.log('Users: ', JSON.stringify(users, null, 2));
    console.log('getUsersTest completed');
    return users;
};

const getUsersByIdsTest = async (userIds: string[]) => {
    console.log('Starting getUsersByIdsTest ...');
    const usersByIds = await getUsersByIds(userIds);
    console.log('Users by IDs: ', JSON.stringify(usersByIds, null, 2));
    console.log('getUsersByIdsTest completed');
};

const getUserByIdTest = async (userId: string) => {
    console.log('Starting getUserByIdTest ...');
    const user = await getUserById(userId);
    console.log('User by ID: ', JSON.stringify(user, null, 2));
    console.log('getUserByIdTest completed');
};

const getUserByUsernameTest = async (username: string) => {
    console.log('Starting getUserByUsernameTest ...');
    console.log("username: ",   username);
    const user = await getUserByUsername(username);
    console.log('User by Username: ', JSON.stringify(user, null, 2));
    console.log('getUserByUsernameTest completed');
};

const getEmailAddressesByUserIdsTest = async (userIds: string[]) => {
    console.log('Starting getEmailAddressesByUserIdsTest ...');
    const emailAddresses = await getEmailAddressesByUserIds(userIds);
    console.log('Email Addresses by User IDs: ', JSON.stringify(emailAddresses, null, 2));
    console.log('getEmailAddressesByUserIdsTest completed');
};

const getAddressesByUserIdsTest = async (userIds: string[]) => {
    console.log('Starting getAddressesByUserIdsTest ...');
    const addresses = await getAddressesByUserIds(userIds);
    console.log('Addresses by User IDs: ', JSON.stringify(addresses, null, 2));
    console.log('getAddressesByUserIdsTest completed');
};

const deleteUserByIdTest = async (userId: string) => {
    console.log('Starting deleteUserByIdTest ...');
    await deleteUserById(userId);
    console.log('deleteUserByIdTest completed');
};

(async function main() {
    try {
        // sync test
        initializeApis();
        // clearUsersTest();
        // syncUsersTest();

        const users = await getUsersTest();
        console.log('Users: ', JSON.stringify(users, null, 2));

        const userIds = users.map(user => user.id);
        await getUsersByIdsTest(userIds);
        await getUserByIdTest(userIds[0]);
        await getUserByUsernameTest(users[0].username!);
        await getEmailAddressesByUserIdsTest(userIds);
        await getAddressesByUserIdsTest(userIds);

        // promise tests in order
        console.log("🎉 All integration tests passed");
    } catch (err) {
        console.error("❌ Integration tests failed:", err);
        process.exit(1);
    }
})();