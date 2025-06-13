import * as dotenv from 'dotenv';
import path from 'path';
import { PostgresConfiguration } from '@/models/configuration';
import { UserDatabaseClient } from '@/storage/user_database_client';
import { UserPostgresClient } from '@/storage/user_postgres_client';
import { User } from '@/models/user';
import { user } from '@/index';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const DATABASE_URL = process.env.DATABASE_URL;

const initializeDatabaseClient = (): UserDatabaseClient => {
    if (!DATABASE_URL) {
        throw new Error('DATABASE_URL is not set in the environment variables');
    }
    const config = {
        connectionString: DATABASE_URL
    } as PostgresConfiguration;
    return new UserPostgresClient(config);
}

const getLatestDateTest = async (client: UserDatabaseClient) => {
    console.log('Starting tests...');
    const latestDate = await client.getLatestUserUpdate();
    console.log(`Latest user update date: ${latestDate}`);
    console.log(`Epoch time: ${latestDate.getTime()}`);
};

const upsertUsersTest = async (client: UserDatabaseClient) => {
    console.log('Starting upsert user test...');
    const users = [
        {
            id: 'user_1',
            firstName: 'John',
            lastName: 'Doe',
            username: 'johndoe',
            imageUrl: 'https://example.com/john.jpg',
            emailAddresses: [
                { id: 'email_1', emailAddress: 'john@example.com' }
            ],
            passwordEnabled: true,
            twoFactorEnabled: false,
            backupCodeEnabled: false,
            createdAt: 1748655000000,
            updatedAt: 1748655000000  // Most recent
        },
        {
            id: 'user_2',
            firstName: 'Jane',
            lastName: 'Smith',
            username: 'janesmith',
            imageUrl: 'https://example.com/jane.jpg',
            emailAddresses: [
                { id: 'email_2', emailAddress: 'jane@example.com' }
            ],
            passwordEnabled: true,
            twoFactorEnabled: true,
            backupCodeEnabled: true,
            createdAt: 1748654000000,
            updatedAt: 1748654000000
        },
        {
            id: 'user_3',
            firstName: 'Bob',
            lastName: null,
            username: null,
            imageUrl: 'https://example.com/bob.jpg',
            emailAddresses: [
                { id: 'email_3', emailAddress: 'bob@example.com' },
                { id: 'email_4', emailAddress: 'bob.work@example.com' }
            ],
            passwordEnabled: false,
            twoFactorEnabled: false,
            backupCodeEnabled: false,
            createdAt: 1748653000000,
            updatedAt: 1748653000000
        },
        {
            id: 'user_4',
            firstName: 'Alice',
            lastName: 'Johnson',
            username: 'alicej',
            imageUrl: 'https://example.com/alice.jpg',
            emailAddresses: [
                { id: 'email_5', emailAddress: 'alice@example.com' }
            ],
            passwordEnabled: true,
            twoFactorEnabled: true,
            backupCodeEnabled: false,
            createdAt: 1748652000000,
            updatedAt: 1748652000000
        },
        {
            id: 'user_5',
            firstName: 'Charlie',
            lastName: 'Brown',
            username: 'charlieb',
            imageUrl: 'https://example.com/charlie.jpg',
            emailAddresses: [
                { id: 'email_6', emailAddress: 'charlie@example.com' },
                { id: 'email_7', emailAddress: 'charlie.personal@gmail.com' }
            ],
            passwordEnabled: false,
            twoFactorEnabled: false,
            backupCodeEnabled: true,
            createdAt: 1748651000000,
            updatedAt: 1748651000000  // Oldest
        }
    ] as User[];
    await client.upsertUsers(users);
    console.log('Users upserted successfully');
};

const countUsersTest = async (client: UserDatabaseClient) => {
    console.log('Starting user count test...');
    const numberOfUsers = await client.countUsers(1748650000000);
    console.log(`Count of Users : ${numberOfUsers}`);
    console.log('countUsersTest completed successfully');
}

const getEmailAddressesByUserIdsTest = async (client: UserDatabaseClient) => {
    console.log('Starting getEmailAddressesByUserIds test...');
    const userIds = ['user_1', 'user_2', 'user_3', 'user_4', 'user_5'];
    const emailAddresses = await client.getEmailAddressesByUserIds(userIds);
    console.log(`Email Addresses for User IDs ${userIds.join(', ')}:`, emailAddresses);
    console.log('getEmailAddressesByUserIdsTest completed successfully');
}

const getUsersTest = async (client: UserDatabaseClient) => {
    console.log('Starting getUsers test...');
    const users = await client.getUsers();
    console.log(`Total Users: ${users.length}`);
    console.log('User Details:', JSON.stringify(users, null, 2));
    console.log('getUsersTest completed successfully');
}

const getUserByUsernameTest = async (client: UserDatabaseClient) => {
    console.log('Starting getUserByUsername test...');
    const users = await client.getUsers();
    const user = await client.getUserByUsername(users[0].username!);
    console.log(`User found: ${user ? JSON.stringify(user, null, 2) : 'No user found'}`);
    console.log('getUserByUsernameTest completed successfully');
}

const deleteUserByIdTest = async (client: UserDatabaseClient) => {
    console.log('Starting deleteUserById test...');
    const userId = 'user_1';
    const usersBeforeDelete = await client.getUsers();
    const emailAddressesBeforeDelete = 
        await client.getEmailAddressesByUserIds(usersBeforeDelete.map(user => user.id));
    console.log('Users before deletion: ', JSON.stringify(usersBeforeDelete, null, 2));
    console.log('Email Addresses before deletion: ', emailAddressesBeforeDelete);
    await client.deleteUserById(userId);
    const usersAfterDelete = await client.getUsers();
    const emailAddressesAfterDelete = 
        await client.getEmailAddressesByUserIds(usersAfterDelete.map(user => user.id));
    console.log('Users after deletion: ', JSON.stringify(usersAfterDelete, null, 2));
    console.log('Email Addresses after deletion: ', emailAddressesAfterDelete);
    console.log(`User with ID ${userId} deleted successfully`);
};

const deleteUsersByIdsTest = async (client: UserDatabaseClient) => {
    console.log('Starting deleteUsersByIds test...');
    const userIds = ['user_2', 'user_3', 'user_4', 'user_5'];
    const usersBeforeDelete = await client.getUsers();
    const emailAddressesBeforeDelete = 
        await client.getEmailAddressesByUserIds(usersBeforeDelete.map(user => user.id));
    console.log('Users before deletion: ', JSON.stringify(usersBeforeDelete, null, 2));
    console.log('Email Addresses before deletion: ', emailAddressesBeforeDelete);
    await client.deleteUsersByIds(userIds);
    const usersAfterDelete = await client.getUsers();
    const emailAddressesAfterDelete = 
        await client.getEmailAddressesByUserIds(usersAfterDelete.map(user => user.id));
    console.log('Users after deletion: ', JSON.stringify(usersAfterDelete, null, 2));
    console.log('Email Addresses after deletion: ', emailAddressesAfterDelete);
    console.log(`Users with IDs ${userIds.join(', ')} deleted successfully`);
}

(async function main() {
    try {
        // sync test
        const clerkClient = initializeDatabaseClient();

        // promise tests in order
        await upsertUsersTest(clerkClient);
        await getLatestDateTest(clerkClient);
        await countUsersTest(clerkClient);
        await getEmailAddressesByUserIdsTest(clerkClient);
        await getUsersTest(clerkClient);
        await getUserByUsernameTest(clerkClient);
        await deleteUserByIdTest(clerkClient);
        await deleteUsersByIdsTest(clerkClient);

        console.log("🎉 All integration tests passed");
    } catch (err) {
        console.error("❌ Integration tests failed:", err);
        process.exit(1);
    }
})();