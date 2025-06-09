import { PoolClient } from 'pg';
import {
    CREATE_USERS_TABLE_QUERY,
    CREATE_EMAIL_ADDRESSES_TABLE_QUERY,
    COUNT_USERS_QUERY,
    GET_USERS_QUERY,
    GET_USERS_BY_IDS_QUERY,
    GET_USER_BY_USERNAME_QUERY,
    GET_EMAIL_ADDRESSES_BY_USER_IDS_QUERY,
    GET_LATEST_USER_UPDATE_QUERY,
    UPSERT_USERS_QUERY,
    UPSERT_EMAIL_ADDRESSES_QUERY,
    DELETE_USERS_BY_IDS_QUERY,
    CREATE_USERS_USERNAME_INDEX,
    CREATE_EMAIL_ADDRESSES_USER_ID_INDEX,
    CREATE_EMAIL_ADDRESSES_EMAIL_INDEX
} from '@/storage/queries';
import { User } from '@/models/user';
import { EmailAddress } from '@/models/email';
import { BasePostgresClient } from '@/storage/persistent/base_postgres_client';
import { UserDatabaseClient } from '@/storage/persistent/user_database_client';
import { PostgresConfiguration } from '@/models/configuration';

class UserPostgresClient extends BasePostgresClient implements UserDatabaseClient {

    constructor(config: PostgresConfiguration) {
        super(config);

        // Register default migrations
        this.registerMigration(0, async (client) => {
            await this.createUsersTable(client);
            await this.createEmailAddressesTable(client);
            await this.queryWithClient(client, CREATE_USERS_USERNAME_INDEX);
            await this.queryWithClient(client, CREATE_EMAIL_ADDRESSES_USER_ID_INDEX);
            await this.queryWithClient(client, CREATE_EMAIL_ADDRESSES_EMAIL_INDEX);
        });
    }

    async createUsersTable(client: PoolClient): Promise<void> {
        await this.queryWithClient(client, CREATE_USERS_TABLE_QUERY);    
    };

    async createEmailAddressesTable(client: PoolClient): Promise<void> {
        await this.queryWithClient(client, CREATE_EMAIL_ADDRESSES_TABLE_QUERY);
    };

    async countUsers(updatedAfter?: number): Promise<number> {
        const result = await this.query(COUNT_USERS_QUERY, [updatedAfter]);
        return parseInt(result.rows[0].total, 10);
    };

    async getUsers(updatedAfter?: number, limit: number = 20, page: number=0): Promise<User[]> {
        const offset = page * limit;
        const result = await this.query(GET_USERS_QUERY, [updatedAfter, limit, offset]);

        const users: User[] = [];
        const userIds: string[] = [];
        for (const row of result.rows) {
            const user: User = {
                id: row.id,
                username: row.username,
                firstName: row.first_name,
                lastName: row.last_name,
                imageUrl: row.image_url,
                passwordEnabled: row.password_enabled,
                twoFactorEnabled: row.two_factor_enabled,
                backupCodeEnabled: row.backup_code_enabled,
                createdAt: new Date(row.created_at).getTime(),
                updatedAt: new Date(row.updated_at).getTime(),
                emailAddresses: [] // Will be populated separately
            };
            users.push(user);
            userIds.push(user.id);
        }
        if (userIds.length === 0) {
            return users; // No users found
        }

        // Fetch email addresses for the users
        const emailAddresses = await this.getEmailAddressesByUserIds(userIds);
        const userIdToEmails: Map<string, EmailAddress[]> = new Map();
        for (const email of emailAddresses) {
            if (!userIdToEmails.has(email.userId!)) {
                userIdToEmails.set(email.userId!, []);
            }
            userIdToEmails.get(email.userId!)!.push(email);
        }
        
        for (const user of users) {
            user.emailAddresses = userIdToEmails.get(user.id) || [];
        }
        return users;
    }

    async getUserById(userId: string): Promise<User | null> {
        const users = await this.getUsersByIds([userId]);
        return users.length > 0 ? users[0] : null; 
    };

    async getUsersByIds(userIds: string[]): Promise<User[]> {
        if (userIds.length === 0) {
            return [];
        }
        const result = await this.query(GET_USERS_BY_IDS_QUERY, [userIds]);
        const users: User[] = [];
        for (const row of result.rows) {
            const user: User = {
                id: row.id,
                username: row.username,
                firstName: row.first_name,
                lastName: row.last_name,
                imageUrl: row.image_url,
                passwordEnabled: row.password_enabled,
                twoFactorEnabled: row.two_factor_enabled,
                backupCodeEnabled: row.backup_code_enabled,
                createdAt: new Date(row.created_at).getTime(),
                updatedAt: new Date(row.updated_at).getTime(),
                emailAddresses: [] // Will be populated separately
            };
            users.push(user);
        }

        if (users.length === 0) {
            return users; // No users found
        }

        // Fetch email addresses for the users
        const emailAddresses = await this.getEmailAddressesByUserIds(userIds);
        const userIdToEmails: Map<string, EmailAddress[]> = new Map();
        for (const email of emailAddresses) {
            if (!userIdToEmails.has(email.userId!)) {
                userIdToEmails.set(email.userId!, []);
            }
            userIdToEmails.get(email.userId!)!.push(email);
        }
        
        for (const user of users) {
            user.emailAddresses = userIdToEmails.get(user.id) || [];
        }
        return users;
    };

    async getUserByUsername(username: string): Promise<User | null> {
        const result = await this.query(GET_USER_BY_USERNAME_QUERY, [username]);
        if (result.rows.length === 0) {
            return null;
        }
        const user: User = {
            id: result.rows[0].id,
            username: result.rows[0].username,
            firstName: result.rows[0].first_name,
            lastName: result.rows[0].last_name,
            imageUrl: result.rows[0].image_url,
            passwordEnabled: result.rows[0].password_enabled,
            twoFactorEnabled: result.rows[0].two_factor_enabled,
            backupCodeEnabled: result.rows[0].backup_code_enabled,
            createdAt: new Date(result.rows[0].created_at).getTime(),
            updatedAt: new Date(result.rows[0].updated_at).getTime(),
            emailAddresses: [] // Will be populated separately
        };
        const emailAddresses = await this.getEmailAddressesByUserIds([user.id]);
        user.emailAddresses = emailAddresses.filter(email => email.userId === user.id);
        return user;
    }

    async getEmailAddressesByUserIds(userIds: string[]): Promise<EmailAddress[]> {
        if (userIds.length === 0) {
            return [];
        }
        const result = await this.query(GET_EMAIL_ADDRESSES_BY_USER_IDS_QUERY, [userIds]);
        const emailAddresses: EmailAddress[] = [];
        for (const row of result.rows) {
            emailAddresses.push({
                id: row.id,
                userId: row.user_id,
                emailAddress: row.email_address
            });
        }
        return emailAddresses;
    };

    async getLatestUserUpdate(): Promise<Date> {
        const result = await this.query(GET_LATEST_USER_UPDATE_QUERY);
        if ( result.rows.length > 0 ) {
            if (result.rows[0].latest_update) {
                return new Date(result.rows[0].latest_update); // Return the latest update date
            } else {
                return new Date(0); // Return epoch if no updates found
            }
        } else { 
            return new Date(0);
        }
    }

    async upsertUsers(users: User[]): Promise<void> {
        if (users.length === 0) {
            return;
        }

        const client = await this.pool.connect();
        try {
            await this.queryWithClient(client, 'BEGIN');
            
            // Prepare user data arrays
            const userIds: string[] = [];
            const usernames: (string | null)[] = [];
            const firstNames: (string | null)[] = [];
            const lastNames: (string | null)[] = [];
            const imageUrls: string[] = [];
            const passwordEnabled: boolean[] = [];
            const twoFactorEnabled: boolean[] = [];
            const backupCodeEnabled: boolean[] = [];
            const createdAts: number[] = [];
            const updatedAts: number[] = [];

            // Prepare email data arrays
            const emailIds: string[] = [];
            const emailUserIds: string[] = [];
            const emailAddresses: string[] = [];

            for (const user of users) {
                userIds.push(user.id);
                usernames.push(user.username);
                firstNames.push(user.firstName);
                lastNames.push(user.lastName);
                imageUrls.push(user.imageUrl);
                passwordEnabled.push(user.passwordEnabled);
                twoFactorEnabled.push(user.twoFactorEnabled);
                backupCodeEnabled.push(user.backupCodeEnabled);
                createdAts.push(user.createdAt);
                updatedAts.push(user.updatedAt);

                for (const email of user.emailAddresses) {
                    emailIds.push(email.id);
                    emailUserIds.push(user.id);
                    emailAddresses.push(email.emailAddress);
                }
            }

            if (userIds.length > 0) {
                await this.queryWithClient(client, UPSERT_USERS_QUERY, [
                    userIds,
                    usernames,
                    firstNames,
                    lastNames,
                    imageUrls,
                    passwordEnabled,
                    twoFactorEnabled,
                    backupCodeEnabled,
                    createdAts,
                    updatedAts
                ]);
            }

            if (emailIds.length > 0) {
                await this.queryWithClient(client, UPSERT_EMAIL_ADDRESSES_QUERY, [
                    emailIds,
                    emailUserIds,
                    emailAddresses
                ]);
            }

            await this.queryWithClient(client, 'COMMIT');
        } catch (error) {
            await this.queryWithClient(client,'ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    };

    async deleteUserById(userId: string): Promise<void >{
        await this.deleteUsersByIds([userId]);
    };

    async deleteUsersByIds (userIds: string[]): Promise<void> {
        if (userIds.length === 0) {
            return; // No users to delete
        }
        await this.query(DELETE_USERS_BY_IDS_QUERY, [userIds]);
    };
}

export {
    UserPostgresClient
};