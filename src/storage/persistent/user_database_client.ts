import { User } from '@/models/user';
import { EmailAddress } from '@/models/email';
import { BaseDatabaseClient } from '@/storage/persistent/base_database_client';

interface UserDatabaseClient extends BaseDatabaseClient {
    countUsers(updatedAfter?: number): Promise<number>;
    getUsers(updatedAfter?: number, limit?: number, page?: number): Promise<User[]>;
    getUserById(userId: string): Promise<User | null>;
    getUsersByIds(userIds: string[]): Promise<User[]>;
    getEmailAddressesByUserIds(userIds: string[]): Promise<EmailAddress[]>;
    getLatestUserUpdate(): Promise<Date>;
    upsertUsers(user: User[]): Promise<void>;
    deleteUserById(userId: string): Promise<void>;
    deleteUsersByIds (userIds: string[]): Promise<void>;
};

export {
    UserDatabaseClient,
};