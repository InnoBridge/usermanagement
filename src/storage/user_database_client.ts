import { user, email, address } from '@innobridge/shared';
import { BaseDatabaseClient } from '@/storage/base_database_client';

interface UserDatabaseClient extends BaseDatabaseClient {
    countUsers(updatedAfter?: number): Promise<number>;
    getUsers(updatedAfter?: number, limit?: number, page?: number): Promise<user.User[]>;
    getUserById(userId: string): Promise<user.User | null>;
    getUsersByIds(userIds: string[]): Promise<user.User[]>;
    getUserByUsername(username: string): Promise<user.User | null>;
    getEmailAddressesByUserIds(userIds: string[]): Promise<email.EmailAddress[]>;
    getAddressesByUserIds(userIds: string[]): Promise<address.Address[]>;
    getLatestUserUpdate(): Promise<Date>;
    upsertUsers(user: user.User[]): Promise<void>;
    deleteUserById(userId: string): Promise<void>;
    deleteUsersByIds (userIds: string[]): Promise<void>;
};

export {
    UserDatabaseClient,
};