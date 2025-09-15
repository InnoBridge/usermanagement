import { PoolClient } from 'pg';
import {
    CREATE_USERS_TABLE_QUERY,
    CREATE_EMAIL_ADDRESSES_TABLE_QUERY,
    CREATE_ADDRESSES_TABLE_QUERY,
    MIGRATE_ADD_PHONE_AND_LANGUAGES_QUERY,
    COUNT_USERS_QUERY,
    GET_USERS_QUERY,
    GET_USERS_BY_IDS_QUERY,
    GET_USER_BY_USERNAME_QUERY,
    GET_EMAIL_ADDRESSES_BY_USER_IDS_QUERY,
    GET_ADDRESSES_BY_USER_IDS_QUERY,
    GET_LATEST_USER_UPDATE_QUERY,
    UPSERT_USERS_QUERY,
    UPSERT_EMAIL_ADDRESSES_QUERY,
    UPSERT_ADDRESS_QUERY,
    DELETE_USERS_BY_IDS_QUERY,
    CREATE_USERS_USERNAME_INDEX,
    CREATE_EMAIL_ADDRESSES_USER_ID_INDEX,
    CREATE_EMAIL_ADDRESSES_EMAIL_INDEX,
    CREATE_ADDRESSES_USER_ID_INDEX,
    CREATE_ADDRESSES_PLACE_ID_INDEX
} from '@/storage/queries';
import { user, email, address } from '@innobridge/shared';
import { BasePostgresClient } from '@/storage/base_postgres_client';
import { UserDatabaseClient } from '@/storage/user_database_client';
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

        this.registerMigration(2, async (client) => {
            await this.createAddressesTable(client);
            await this.queryWithClient(client, CREATE_ADDRESSES_USER_ID_INDEX);
            await this.queryWithClient(client, CREATE_ADDRESSES_PLACE_ID_INDEX);
        });

        this.registerMigration(3, async (client) => {
            await this.queryWithClient(client, MIGRATE_ADD_PHONE_AND_LANGUAGES_QUERY);
        });
    }

    async createUsersTable(client: PoolClient): Promise<void> {
        await this.queryWithClient(client, CREATE_USERS_TABLE_QUERY);    
    };

    async createEmailAddressesTable(client: PoolClient): Promise<void> {
        await this.queryWithClient(client, CREATE_EMAIL_ADDRESSES_TABLE_QUERY);
    };

    async createAddressesTable(client: PoolClient): Promise<void> {
        await this.queryWithClient(client, CREATE_ADDRESSES_TABLE_QUERY);
    }

    async countUsers(updatedAfter?: number): Promise<number> {
        const result = await this.query(COUNT_USERS_QUERY, [updatedAfter]);
        return parseInt(result.rows[0].total, 10);
    };

    async getUsers(updatedAfter?: number, limit: number = 20, page: number=0): Promise<user.User[]> {
        const offset = page * limit;
        const result = await this.query(GET_USERS_QUERY, [updatedAfter, limit, offset]);

        const users: user.User[] = [];
        const userIds: string[] = [];
        for (const row of result.rows) {
            const user: user.User = {
                id: row.id,
                username: row.username,
                firstName: row.first_name,
                lastName: row.last_name,
                phoneNumber: row.phone_number,
                languages: row.languages,
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
        const userIdToEmails: Map<string, email.EmailAddress[]> = new Map();
        for (const email of emailAddresses) {
            if (!userIdToEmails.has(email.userId!)) {
                userIdToEmails.set(email.userId!, []);
            }
            userIdToEmails.get(email.userId!)!.push(email);
        }

        // Fetch addresses for the users
        const addresses = await this.getAddressesByUserIds(userIds);
        const userIdToAddresses: Map<string, address.Address> = new Map();
        for (const address of addresses) {
            userIdToAddresses.set(address.userId!, address);
        }

        for (const user of users) {
            user.emailAddresses = userIdToEmails.get(user.id) || [];
            if (userIdToAddresses.has(user.id)) {
                user.address = userIdToAddresses.get(user.id)!;
            }
        }
        return users;
    }

    async getUserById(userId: string): Promise<user.User | null> {
        const users = await this.getUsersByIds([userId]);
        return users.length > 0 ? users[0] : null; 
    };

    async getUsersByIds(userIds: string[]): Promise<user.User[]> {
        if (userIds.length === 0) {
            return [];
        }
        const result = await this.query(GET_USERS_BY_IDS_QUERY, [userIds]);
        const users: user.User[] = [];
        for (const row of result.rows) {
            const user: user.User = {
                id: row.id,
                username: row.username,
                firstName: row.first_name,
                lastName: row.last_name,
                phoneNumber: row.phone_number,
                languages: row.languages,
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
        const userIdToEmails: Map<string, email.EmailAddress[]> = new Map();
        for (const email of emailAddresses) {
            if (!userIdToEmails.has(email.userId!)) {
                userIdToEmails.set(email.userId!, []);
            }
            userIdToEmails.get(email.userId!)!.push(email);
        }

        // Fetch addresses for users
        const addresses = await this.getAddressesByUserIds(userIds);
        const userIdToAddresses: Map<string, address.Address> = new Map();
        for (const address of addresses) {
            userIdToAddresses.set(address.userId!, address);
        }

        for (const user of users) {
            user.emailAddresses = userIdToEmails.get(user.id) || [];
            if (userIdToAddresses.has(user.id)) {
                user.address = userIdToAddresses.get(user.id)!;
            }
        }
        return users;
    };

    async getUserByUsername(username: string): Promise<user.User | null> {
        const result = await this.query(GET_USER_BY_USERNAME_QUERY, [username]);
        if (result.rows.length === 0) {
            return null;
        }
        const user: user.User = {
            id: result.rows[0].id,
            username: result.rows[0].username,
            firstName: result.rows[0].first_name,
            lastName: result.rows[0].last_name,
            phoneNumber: result.rows[0].phone_number,
            languages: result.rows[0].languages,
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
        const addresses = await this.getAddressesByUserIds([user.id]);
        if (addresses.length > 0) {
            user.address = addresses[0];
        }
        return user;
    }

    async getEmailAddressesByUserIds(userIds: string[]): Promise<email.EmailAddress[]> {
        if (userIds.length === 0) {
            return [];
        }
        const result = await this.query(GET_EMAIL_ADDRESSES_BY_USER_IDS_QUERY, [userIds]);
        const emailAddresses: email.EmailAddress[] = [];
        result.rows.forEach(row => {
            emailAddresses.push(mapToEmailAddress(row));
        });
        return emailAddresses;
    };

    async getAddressesByUserIds(userIds: string[]): Promise<address.Address[]> {
        if (userIds.length === 0) {
            return [];
        }
        const result = await this.query(GET_ADDRESSES_BY_USER_IDS_QUERY, [userIds]);
        const addresses: address.Address[] = [];
        result.rows.forEach(row => {
            addresses.push(mapToAddress(row));
        });
        return addresses;
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

    async upsertUsers(users: user.User[]): Promise<void> {
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
            const imageUrls: (string | null)[] = [];
            const phoneNumbers: (string | null)[] = [];
            const languagesJson: string[] = [];
            const passwordEnabled: boolean[] = [];
            const twoFactorEnabled: boolean[] = [];
            const backupCodeEnabled: boolean[] = [];
            const createdAts: number[] = [];
            const updatedAts: number[] = [];

            // Prepare email data arrays
            const emailIds: string[] = [];
            const emailUserIds: string[] = [];
            const emailAddresses: string[] = [];

            // Prepare address data arrays
            const addressIds: string[] = [];
            const addressUserIds: string[] = [];
            const placeIds: string[] = [];
            const addressName: (string | null)[] = [];
            const addressUnitNumber: (string | null)[] = [];
            const addressCity: (string | null)[] = [];
            const addressProvince: (string | null)[] = [];
            const addressPostalCode: (string | null)[] = [];
            const addressCountry: (string | null)[] = [];
            const addressLat: (number | null)[] = [];
            const addressLng: (number | null)[] = [];

            for (const user of users) {
                userIds.push(user.id);
                usernames.push(user.username);
                firstNames.push(user.firstName);
                lastNames.push(user.lastName);
                imageUrls.push(user.imageUrl);
                phoneNumbers.push(user.phoneNumber ?? null);
                languagesJson.push(JSON.stringify(user.languages ?? [])); // push JSON string per user
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

                if (user.address) {
                    addressIds.push(user.address.id);
                    addressUserIds.push(user.address.userId);
                    placeIds.push(user.address.placeId);
                    addressName.push(user.address.name || null);
                    addressUnitNumber.push(user.address.unitNumber || null);
                    addressCity.push(user.address.city || null);
                    addressProvince.push(user.address.province || null);
                    addressCountry.push(user.address.country || null);
                    addressPostalCode.push(user.address.postalCode || null);
                    addressLat.push(user.address.location ? user.address.location.lat : null);
                    addressLng.push(user.address.location ? user.address.location.lng : null);
                }
            }

            if (userIds.length > 0) {
                await this.queryWithClient(client, UPSERT_USERS_QUERY, [
                    userIds,
                    usernames,
                    firstNames,
                    lastNames,
                    imageUrls,
                    phoneNumbers,
                    languagesJson,
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

            if (addressIds.length > 0) {
                await this.queryWithClient(client, UPSERT_ADDRESS_QUERY, [
                    addressIds,
                    addressUserIds,
                    placeIds,
                    addressName,
                    addressUnitNumber,
                    addressCity,
                    addressProvince,
                    addressPostalCode,
                    addressCountry,
                    addressLat,
                    addressLng
                ]);
            }

            await this.queryWithClient(client, 'COMMIT');
        } catch (error) {
            await this.queryWithClient(client,'ROLLBACK');
            console.error("Error occurred during upsert operation:", error);
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
};

const mapToEmailAddress = (row: any): email.EmailAddress => {
    return {
        id: row.id,
        userId: row.user_id,
        emailAddress: row.email_address
    };
};

const mapToAddress = (row: any): address.Address => {
    return {
        id: row.id,
        userId: row.user_id,
        placeId: row.place_id,
        unitNumber: row.unit_number,
        city: row.city,
        province: row.province,
        postalCode: row.postal_code,
        country: row.country,
        location: {
            lat: row.lat,
            lng: row.lng
        }
    };
};

export {
    UserPostgresClient
};