import { isDatabaseClientSet, getDatabaseClient } from '@/api/database';
import { provider, email, address } from '@innobridge/shared';

const getProviders = async (updatedAfter?: number, limit?: number, page?: number): Promise<provider.Provider[]> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.getProviders(updatedAfter, limit, page);
};

const getProviderById = async (providerId: string): Promise<provider.Provider | null> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.getProviderById(providerId);
};

const getProvidersByIds = async (providerIds: string[]): Promise<provider.Provider[]> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.getProvidersByIds(providerIds);
};

const getProviderByProvidername = async (providername: string): Promise<provider.Provider | null> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.getProviderByProvidername(providername);
};

const getProviderEmailAddressesByProviderIds = async (providerIds: string[]): Promise<email.ProviderEmailAddress[]> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.getProviderEmailAddressesByProviderIds(providerIds);
};

const getProviderAddressesByProviderIds = async (providerIds: string[]): Promise<address.ProviderAddress[]> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.getProviderAddressesByProviderIds(providerIds);
};

const getLatestProviderUpdate = async (): Promise<Date> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.getLatestProviderUpdate();
};

const upsertProviders = async (providers: provider.Provider[]): Promise<void> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.upsertProviders(providers);
};

const deleteProviderById = async (providerId: string): Promise<void> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.deleteProviderById(providerId);
};

const deleteProvidersByIds = async (providerIds: string[]): Promise<void> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.deleteProvidersByIds(providerIds);
};

const shutdownDatabase = async (): Promise<void> => {
    if (isDatabaseClientSet()) {
        await getDatabaseClient()?.shutdown();
    }
};

export {
    getProviders,
    getProviderById,
    getProvidersByIds,
    getProviderByProvidername,
    getProviderEmailAddressesByProviderIds,
    getProviderAddressesByProviderIds,
    getLatestProviderUpdate,
    upsertProviders,
    deleteProviderById,
    deleteProvidersByIds,
    shutdownDatabase
};