import { PoolClient, QueryResult } from 'pg';
import { User } from '@/models/user';
import { EmailAddress } from '@/models/email';

interface DatabaseClient {
    queryWithClient(client: PoolClient, text: string, params?: any[]): Promise<QueryResult>;
    query(query: string, params?: any[]): Promise<any>;
    registerMigration(fromVersion: number, migrationFn: (client: PoolClient) => Promise<void>): void
    initializeDatabase(): Promise<void>;
    countUsers(updatedAfter?: number): Promise<number>;
    getUsers(updatedAfter?: number, limit?: number, page?: number): Promise<User[]>;
    getUserById(userId: string): Promise<User | null>;
    getUsersByIds(userIds: string[]): Promise<User[]>;
    getEmailAddressesByUserIds(userIds: string[]): Promise<EmailAddress[]>;
    getLatestUserUpdate(): Promise<Date>;
    upsertUsers(user: User[]): Promise<void>;
    deleteUserById(userId: string): Promise<void>;
    deleteUsersByIds (userIds: string[]): Promise<void>;
    shutdown(): Promise<void>;
};

export {
    DatabaseClient,
};