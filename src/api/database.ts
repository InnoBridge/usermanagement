import { DatabaseClient } from '@/storage/persistent/database_client';
import { PostgresClient } from '@/storage/persistent/postgres_client';
import { DatabaseConfiguration } from '@/models/configuration';
import { PoolClient } from 'pg';
import { getUserList } from '@/api/auth';
import { User } from '@/models/user';
import { EmailAddress } from '@/models/email';

let databaseClient: DatabaseClient | null = null;

const initializeDatabase = async (
    config: DatabaseConfiguration,
    registerMigrations?: Map<number, (client: PoolClient) => Promise<void>> 
): Promise<void> => {
    databaseClient = new PostgresClient(config);
    if (registerMigrations) {
        registerMigrations.forEach((migration, version) => {
            databaseClient?.registerMigration(version, migration);
        });
    }
    await databaseClient.initializeDatabase();
};

const isDatabaseClientSet = (): boolean => {
    return databaseClient !== null;
};

const queryWithClient = async (client: PoolClient, query: string, params?: any[]): Promise<any> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await databaseClient?.queryWithClient(client, query, params);
};

const query = async (query: string, params?: any[]): Promise<any> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await databaseClient?.query(query, params);
};

const countUsers = async (updatedAfter?: number): Promise<number> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await databaseClient!.countUsers(updatedAfter);
};

const getUsers = async (updatedAfter?: number, limit?: number, page?: number): Promise<User[]> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await databaseClient!.getUsers(updatedAfter, limit, page);
};

const getUserById = async (userId: string): Promise<User | null> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await databaseClient!.getUserById(userId);
};

const getUsersByIds = async (userIds: string[]): Promise<User[]> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await databaseClient!.getUsersByIds(userIds);
};

const getEmailAddressesByUserIds = async (userIds: string[]): Promise<EmailAddress[]> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await databaseClient!.getEmailAddressesByUserIds(userIds);
};

const getLatestUserUpdate = async (): Promise<Date> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await databaseClient!.getLatestUserUpdate();
};

const upsertUsers = async (users: User[]): Promise<void> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await databaseClient?.upsertUsers(users);
};

const syncUsers = async (limit: number = 100): Promise<void> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    
    const latestUpdate = await getLatestUserUpdate();
    const updatedAfter = latestUpdate.getTime();
    
    let offset = 0;
    let users: User[] = [];
    
    do {
        users = await getUserList(limit, offset, updatedAfter);
        console.log(`Syncing ${users.length} users from offset ${offset}`);
        await upsertUsers(users);
        offset += limit;
    } while (users.length > 0);
};

const deleteUserById = async (userId: string): Promise<void> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await deleteUserById(userId);
};

const deleteUsersByIds = async (userIds: string[]): Promise<void> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await databaseClient?.deleteUsersByIds(userIds);
};

const shutdownDatabase = async (): Promise<void> => {
    if (isDatabaseClientSet()) {
        await databaseClient?.shutdown();
    }
};

export {
    initializeDatabase,
    isDatabaseClientSet,
    queryWithClient,
    query,
    countUsers,
    getUsers,
    getUserById,
    getUsersByIds,
    getEmailAddressesByUserIds,
    getLatestUserUpdate,
    upsertUsers,
    syncUsers,
    deleteUserById,
    deleteUsersByIds,
    shutdownDatabase
};