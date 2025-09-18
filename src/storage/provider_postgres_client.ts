import { PoolClient } from 'pg';
import { ConnectionsPostgresClient } from '@/storage/connections_postgres_client';
import {
    CREATE_PROVIDERS_TABLE_QUERY,
    CREATE_PROVIDER_EMAIL_ADDRESSES_TABLE_QUERY,
    CREATE_PROVIDER_ADDRESSES_TABLE_QUERY,
    CREATE_PROVIDERS_PROVIDERNAME_INDEX,
    CREATE_PROVIDERS_BUSINESS_NAME_INDEX,
    CREATE_PROVIDER_EMAIL_ADDRESSES_ID_INDEX,
    CREATE_PROVIDER_EMAIL_ADDRESSES_EMAIL_INDEX,
    CREATE_PROVIDER_ADDRESSES_PROVIDER_ID_INDEX,
    CREATE_PROVIDER_ADDRESSES_PLACE_ID_INDEX,
    COUNT_PROVIDERS_QUERY,
    GET_PROVIDERS_QUERY,
    GET_PROVIDERS_BY_IDS_QUERY,
    GET_PROVIDER_BY_PROVIDERNAME_QUERY,
    GET_PROVIDER_EMAIL_ADDRESSES_BY_PROVIDER_IDS_QUERY,
    GET_PROVIDER_ADDRESSES_BY_PROVIDER_IDS_QUERY,
    GET_LATEST_PROVIDER_UPDATE_QUERY,
    UPSERT_PROVIDERS_QUERY,
    UPSERT_PROVIDER_EMAIL_ADDRESSES_QUERY,
    UPSERT_PROVIDER_ADDRESSES_QUERY,
    DELETE_PROVIDERS_BY_IDS_QUERY
} from '@/storage/provider_queries';
import { provider, email, address } from '@innobridge/shared';
import { ProviderDatabaseClient } from '@/storage/provider_database_client';
import { PostgresConfiguration } from '@/models/configuration';

class ProviderPostgresClient extends ConnectionsPostgresClient implements ProviderDatabaseClient {
    
    constructor(config: PostgresConfiguration) {
        super(config);

        // Register default migrations
        this.registerMigration(4, async (client) => {
            await this.createProvidersTable(client);
            await this.createProviderEmailAddressesTable(client);
            await this.createProviderAddressesTable(client);
            await this.queryWithClient(client, CREATE_PROVIDERS_PROVIDERNAME_INDEX);
            await this.queryWithClient(client, CREATE_PROVIDERS_BUSINESS_NAME_INDEX);
            await this.queryWithClient(client, CREATE_PROVIDER_EMAIL_ADDRESSES_ID_INDEX);
            await this.queryWithClient(client, CREATE_PROVIDER_EMAIL_ADDRESSES_EMAIL_INDEX);
            await this.queryWithClient(client, CREATE_PROVIDER_ADDRESSES_PROVIDER_ID_INDEX);
            await this.queryWithClient(client, CREATE_PROVIDER_ADDRESSES_PLACE_ID_INDEX);
        })
    }

    async createProvidersTable(client: PoolClient): Promise<void> {
        await this.queryWithClient(client, CREATE_PROVIDERS_TABLE_QUERY);
    };

    async createProviderEmailAddressesTable(client: PoolClient): Promise<void> {
        await this.queryWithClient(client, CREATE_PROVIDER_EMAIL_ADDRESSES_TABLE_QUERY);
    };

    async createProviderAddressesTable(client: PoolClient): Promise<void> {
        await this.queryWithClient(client, CREATE_PROVIDER_ADDRESSES_TABLE_QUERY);
    };

    async countProviders(updatedAfter?: number): Promise<number> {
        const result = await this.query(COUNT_PROVIDERS_QUERY, [updatedAfter]);
        return parseInt(result.rows[0].total, 10);
    };

    async getProviders(updatedAfter?: number, limit: number = 20, page: number = 0): Promise<provider.Provider[]> {
        const offset = page * limit;
        const result = await this.query(GET_PROVIDERS_QUERY, [updatedAfter, limit, offset]);

        const providers: provider.Provider[] = [];
        const providerIds: string[] = [];
        for (const row of result.rows) {
            const provider: provider.Provider = {
                id: row.id,
                providerName: row.providername,
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
                emailAddresses: [], // Will be populated later
                serviceRadius: row.service_radius,
                canVisitClientHome: row.can_visit_client_home,
                virtualHelpOffered: row.virtual_help_offered,
                businessName: row.business_name,
            };
            providers.push(provider);
            providerIds.push(row.id);
        }
        if (providerIds.length === 0) {
            return providers; // No providers found
        }

        // Fetch email addresses for providers
        const providerEmailAddresses = await this.getProviderEmailAddressesByProviderIds(providerIds);
        const providerIdToProviderEmails: Map<string, email.ProviderEmailAddress[]> = new Map();
        for (const providerEmail of providerEmailAddresses) {
            if (!providerIdToProviderEmails.has(providerEmail.providerId!)) {
                providerIdToProviderEmails.set(providerEmail.providerId!, []);
            }
            providerIdToProviderEmails.get(providerEmail.providerId!)!.push(providerEmail);
        }

        // Fetch addresses for providers
        const providerAddresses = await this.getProviderAddressesByProviderIds(providerIds);
        const providerIdToProviderAddresses: Map<string, address.ProviderAddress> = new Map();
        for (const providerAddress of providerAddresses) {
            providerIdToProviderAddresses.set(providerAddress.providerId!, providerAddress);
        }

        for (const provider of providers) {
            provider.emailAddresses = providerIdToProviderEmails.get(provider.id) || [];
            if (providerIdToProviderAddresses.has(provider.id)) {
                provider.address = providerIdToProviderAddresses.get(provider.id);
            }
        }
        return providers;
    };

    async getProviderById(providerId: string): Promise<provider.Provider | null> {
        const providers = await this.getProvidersByIds([providerId]);
        return providers.length > 0 ? providers[0] : null;
    };

    async getProvidersByIds(providerIds: string[]): Promise<provider.Provider[]> {
        if (providerIds.length === 0) {
            return [];
        }
        const result = await this.query(GET_PROVIDERS_BY_IDS_QUERY, [providerIds]);
        const providers: provider.Provider[] = [];
        for (const row of result.rows) {
            const provider: provider.Provider = {
                id: row.id,
                providerName: row.providername,
                firstName: row.first_name,
                lastName: row.last_name,
                phoneNumber: row.phone_number,
                languages: row.languages,
                imageUrl: row.image_url,
                passwordEnabled: row.password_enabled,
                twoFactorEnabled: row.two_factor_enabled,
                backupCodeEnabled: row.backup_code_enabled,       
                serviceRadius: row.service_radius,
                canVisitClientHome: row.can_visit_client_home,
                virtualHelpOffered: row.virtual_help_offered,
                businessName: row.business_name,
                createdAt: new Date(row.created_at).getTime(),
                updatedAt: new Date(row.updated_at).getTime(),
                emailAddresses: [], // Will be populated later
            };
            providers.push(provider);
        }

        if (providers.length === 0) {
            return providers; // No providers found
        }

        // Fetch email addresses for providers
        const providerEmailAddresses = await this.getProviderEmailAddressesByProviderIds(providerIds);
        const providerIdToProviderEmails: Map<string, email.ProviderEmailAddress[]> = new Map();
        for (const providerEmail of providerEmailAddresses) {
            if (!providerIdToProviderEmails.has(providerEmail.providerId!)) {
                providerIdToProviderEmails.set(providerEmail.providerId!, []);
            }
            providerIdToProviderEmails.get(providerEmail.providerId!)!.push(providerEmail);
        }

        // Fetch addresses for providers
        const providerAddresses = await this.getProviderAddressesByProviderIds(providerIds);
        const providerIdToProviderAddresses: Map<string, address.ProviderAddress> = new Map();
        for (const providerAddress of providerAddresses) {
            providerIdToProviderAddresses.set(providerAddress.providerId!, providerAddress);
        }

        for (const provider of providers) {
            provider.emailAddresses = providerIdToProviderEmails.get(provider.id) || [];
            if (providerIdToProviderAddresses.has(provider.id)) {
                provider.address = providerIdToProviderAddresses.get(provider.id)!;
            }
        }
        return providers;
    };

    async getProviderByProvidername(providername: string): Promise<provider.Provider | null> {
        const result = await this.query(GET_PROVIDER_BY_PROVIDERNAME_QUERY, [providername]);
        if (result.rows.length === 0) {
            return null;
        }
        const provider: provider.Provider = {
            id: result.rows[0].id,
            providerName: result.rows[0].providername,
            firstName: result.rows[0].first_name,
            lastName: result.rows[0].last_name,
            phoneNumber: result.rows[0].phone_number,
            languages: result.rows[0].languages,
            imageUrl: result.rows[0].image_url,
            passwordEnabled: result.rows[0].password_enabled,
            twoFactorEnabled: result.rows[0].two_factor_enabled,
            backupCodeEnabled: result.rows[0].backup_code_enabled,
            serviceRadius: result.rows[0].service_radius,
            canVisitClientHome: result.rows[0].can_visit_client_home,
            virtualHelpOffered: result.rows[0].virtual_help_offered,
            businessName: result.rows[0].business_name,
            createdAt: new Date(result.rows[0].created_at).getTime(),
            updatedAt: new Date(result.rows[0].updated_at).getTime(),
            emailAddresses: [], // Will be populated later
        };
        const providerEmailAddresses = await this.getProviderEmailAddressesByProviderIds([provider.id]);
        provider.emailAddresses = providerEmailAddresses.filter(email => email.providerId === provider.id);
        const providerAddresses = await this.getProviderAddressesByProviderIds([provider.id]);
        if (providerAddresses.length > 0) {
            provider.address = providerAddresses[0];
        }
        return provider;
    };

    async getProviderEmailAddressesByProviderIds(providerIds: string[]): Promise<email.ProviderEmailAddress[]> {
        if (providerIds.length === 0) {
            return [];
        }
        const result = await this.query(GET_PROVIDER_EMAIL_ADDRESSES_BY_PROVIDER_IDS_QUERY, [providerIds]);
        const providerEmailAddresses: email.ProviderEmailAddress[] = [];
        result.rows.forEach((row) => {
            providerEmailAddresses.push(mapToProviderEmailAddress(row));
        });
        return providerEmailAddresses;
    };

    async getProviderAddressesByProviderIds(providerIds: string[]): Promise<address.ProviderAddress[]> {
        if (providerIds.length === 0) {
            return [];
        }
        const result = await this.query(GET_PROVIDER_ADDRESSES_BY_PROVIDER_IDS_QUERY, [providerIds]);
        const providerAddresses: address.ProviderAddress[] = [];
        result.rows.forEach((row) => {
            providerAddresses.push(mapToProviderAddress(row));
        });
        return providerAddresses;
    };

    async getLatestProviderUpdate(): Promise<Date> {
        const result = await this.query(GET_LATEST_PROVIDER_UPDATE_QUERY);
        if (result.rows.length > 0) {
            if (result.rows[0].latest_update) {
                return new Date(result.rows[0].latest_update); // Return the latest update date
            } else {
                return new Date(0); // No updates found, return epoch
            }
        } else {
            return new Date(0); // No updates found, return epoch
        }
    };

    async upsertProviders(providers: provider.Provider[]): Promise<void> {
        if (providers.length === 0) {
            return;
        }

        const client = await this.pool.connect();
        try {
            await this.queryWithClient(client, 'BEGIN');

            // Prepare provider data arrays
            const providerIds: string[] = [];
            const providerNames: (string | null)[] = [];
            const firstNames: (string | null)[] = [];
            const lastNames: (string | null)[] = [];
            const imageUrls: (string | null)[] = [];
            const phoneNumbers: (string | null)[] = [];
            const languagesJson: string[] = [];
            const passwordEnabled: boolean[] = [];
            const twoFactorEnabled: boolean[] = [];
            const backupCodeEnabled: boolean[] = [];
            const serviceRadius: (number | null)[] = [];
            const canVisitClientHome: (boolean | null)[] = [];
            const virtualHelpOffered: (boolean | null)[] = [];
            const businessNames: (string | null)[] = [];
            const createdAts: number[] = [];
            const updatedAts: number[] = [];

            // Prepare email data arrays
            const emailIds: string[] = [];
            const emailProviderIds: string[] = [];
            const emailAddresses: string[] = [];

            // Prepare address data arrays
            const addressIds: string[] = [];
            const addressProviderIds: string[] = [];
            const placeIds: (string | null)[] = [];
            const addressName: (string | null)[] = [];
            const addressUnitNumber: (string | null)[] = [];
            const addressCity: (string | null)[] = [];
            const addressProvince: (string | null)[] = [];
            const addressPostalCodes: (string | null)[] = [];
            const addressCountry: (string | null)[] = [];
            const addressLat: (number | null)[] = [];
            const addressLng: (number | null)[] = [];

            for (const provider of providers) {
                providerIds.push(provider.id);
                providerNames.push(provider.providerName || null);
                firstNames.push(provider.firstName || null);
                lastNames.push(provider.lastName || null);
                imageUrls.push(provider.imageUrl || null);
                phoneNumbers.push(provider.phoneNumber || null);
                languagesJson.push(JSON.stringify(provider.languages || []));
                passwordEnabled.push(provider.passwordEnabled || false);
                twoFactorEnabled.push(provider.twoFactorEnabled || false);
                backupCodeEnabled.push(provider.backupCodeEnabled || false);
                serviceRadius.push(provider.serviceRadius || null);
                canVisitClientHome.push(provider.canVisitClientHome ?? null);
                virtualHelpOffered.push(provider.virtualHelpOffered ?? null);
                businessNames.push(provider.businessName || null);
                createdAts.push(provider.createdAt || Date.now());
                updatedAts.push(provider.updatedAt || Date.now());

                if (provider.emailAddresses) {
                    for (const emailAddr of provider.emailAddresses) {
                        emailIds.push(emailAddr.id);
                        emailProviderIds.push(provider.id);
                        emailAddresses.push(emailAddr.emailAddress);
                    }
                }

                if (provider.address) {
                    addressIds.push(provider.address.id);
                    addressProviderIds.push(provider.id);
                    placeIds.push(provider.address.placeId || null);
                    addressName.push(provider.address.name || null);
                    addressUnitNumber.push(provider.address.unitNumber || null);
                    addressCity.push(provider.address.city || null);
                    addressProvince.push(provider.address.province || null);
                    addressPostalCodes.push(provider.address.postalCode || null);
                    addressCountry.push(provider.address.country || null);
                    addressLat.push(provider.address.location ? provider.address.location.lat : null);
                    addressLng.push(provider.address.location ? provider.address.location.lng : null);
                }
            }

            if (providerIds.length > 0) {
                await this.queryWithClient(client, UPSERT_PROVIDERS_QUERY, [
                    providerIds,
                    providerNames,
                    firstNames,
                    lastNames,
                    imageUrls,
                    phoneNumbers,
                    languagesJson,
                    passwordEnabled,
                    twoFactorEnabled,
                    backupCodeEnabled,
                    serviceRadius,
                    canVisitClientHome,
                    virtualHelpOffered,
                    businessNames,
                    createdAts,
                    updatedAts
                ]);
            }

            if (emailIds.length > 0) {
                await this.queryWithClient(client, UPSERT_PROVIDER_EMAIL_ADDRESSES_QUERY, [
                    emailIds,
                    emailProviderIds,
                    emailAddresses
                ]);
            }

            if (addressIds.length > 0) {
                await this.queryWithClient(client, UPSERT_PROVIDER_ADDRESSES_QUERY, [
                    addressIds,
                    addressProviderIds,
                    placeIds,
                    addressName,
                    addressUnitNumber,
                    addressCity,
                    addressProvince,
                    addressPostalCodes,
                    addressCountry,
                    addressLat,
                    addressLng
                ]);
            }

            await this.queryWithClient(client, 'COMMIT');
        } catch (error) {
            await this.queryWithClient(client, 'ROLLBACK');
            console.error('Error upserting providers:', error);
            throw error;
        } finally {
            client.release();
        }
    };

    async deleteProviderById(providerId: string): Promise<void> {
        await this.deleteProvidersByIds([providerId]);
    };
    
    async deleteProvidersByIds(providerIds: string[]): Promise<void> {
        if (providerIds.length === 0) {
            return; // Nothing to delete
        }
        await this.query(DELETE_PROVIDERS_BY_IDS_QUERY, [providerIds]);
    }
}

const mapToProviderEmailAddress = (row: any): email.ProviderEmailAddress => {
    return {
        id: row.id,
        providerId: row.provider_id,
        emailAddress: row.email_address
    };
};

const mapToProviderAddress = (row: any): address.ProviderAddress => {
    return {
        id: row.id,
        providerId: row.provider_id,
        placeId: row.place_id,
        unitNumber: row.unit_number,
        name: row.name,
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
    ProviderPostgresClient,
};