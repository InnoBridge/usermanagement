import { provider, email, address } from '@innobridge/shared';
import { ConnectionsDatabaseClient } from '@/storage/connections_database_client';

interface ProviderDatabaseClient extends ConnectionsDatabaseClient {
    countProviders(updatedAfter?: number): Promise<number>;
    getProviders(updatedAfter?: number, limit?: number, page?: number): Promise<provider.Provider[]>;
    getProviderById(providerId: string): Promise<provider.Provider | null>;
    getProvidersByIds(providerIds: string[]): Promise<provider.Provider[]>;
    getProviderByProvidername(providername: string): Promise<provider.Provider | null>;
    getProviderEmailAddressesByProviderIds(providerIds: string[]): Promise<email.ProviderEmailAddress[]>;
    getProviderAddressesByProviderIds(providerIds: string[]): Promise<address.ProviderAddress[]>;
    getLatestProviderUpdate(): Promise<Date>;
    upsertProviders(provider: provider.Provider[]): Promise<void>;
    deleteProviderById(providerId: string): Promise<void>;
    deleteProvidersByIds (providerIds: string[]): Promise<void>;
};

export {
    ProviderDatabaseClient,
};