import { getUserList } from '@/api/auth';
import { isDatabaseClientSet, getDatabaseClient } from '@/api/database';
import { user, email, address } from '@innobridge/shared';

const getUsers = async (updatedAfter?: number, limit?: number, page?: number): Promise<user.User[]> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.getUsers(updatedAfter, limit, page);
};

const getUserById = async (userId: string): Promise<user.User | null> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.getUserById(userId);
};

const getUsersByIds = async (userIds: string[]): Promise<user.User[]> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.getUsersByIds(userIds);
};

const getUserByUsername = async (username: string): Promise<user.User | null> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.getUserByUsername(username);
};

const getEmailAddressesByUserIds = async (userIds: string[]): Promise<email.EmailAddress[]> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.getEmailAddressesByUserIds(userIds);
};

const getAddressesByUserIds = async (userIds: string[]): Promise<address.Address[]> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.getAddressesByUserIds(userIds);
};

const getLatestUserUpdate = async (): Promise<Date> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.getLatestUserUpdate();
};

const upsertUsers = async (users: user.User[]): Promise<void> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.upsertUsers(users);
};

const syncUsers = async (limit: number = 100): Promise<void> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    
    const latestUpdate = await getLatestUserUpdate();
    const updatedAfter = latestUpdate.getTime();
    
    let offset = 0;
    let users: user.User[] = [];
    
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
    return await getDatabaseClient()!.deleteUserById(userId);
};

const deleteUsersByIds = async (userIds: string[]): Promise<void> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.deleteUsersByIds(userIds);
};

const shutdownDatabase = async (): Promise<void> => {
    if (isDatabaseClientSet()) {
        await getDatabaseClient()!.shutdown();
    }
};

export {
    getUsers,
    getUserById,
    getUsersByIds,
    getUserByUsername,
    getEmailAddressesByUserIds,
    getAddressesByUserIds,
    getLatestUserUpdate,
    upsertUsers,
    syncUsers,
    deleteUserById,
    deleteUsersByIds,
    shutdownDatabase
};