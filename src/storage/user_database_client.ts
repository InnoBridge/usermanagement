import { User } from '@/models/user';
import { EmailAddress } from '@/models/email';
import { address } from '@innobridge/shared';
import { BaseDatabaseClient } from '@/storage/base_database_client';

interface UserDatabaseClient extends BaseDatabaseClient {
    countUsers(updatedAfter?: number): Promise<number>;
    getUsers(updatedAfter?: number, limit?: number, page?: number): Promise<User[]>;
    getUserById(userId: string): Promise<User | null>;
    getUsersByIds(userIds: string[]): Promise<User[]>;
    getUserByUsername(username: string): Promise<User | null>;
    getEmailAddressesByUserIds(userIds: string[]): Promise<EmailAddress[]>;
    getAddressesByUserIds(userIds: string[]): Promise<address.Address[]>;
    getLatestUserUpdate(): Promise<Date>;
    upsertUsers(user: User[]): Promise<void>;
    deleteUserById(userId: string): Promise<void>;
    deleteUsersByIds (userIds: string[]): Promise<void>;
};

export {
    UserDatabaseClient,
};