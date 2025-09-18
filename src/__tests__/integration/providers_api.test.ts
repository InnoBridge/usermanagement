import * as dotenv from 'dotenv';
import path from 'path';
import {
    initializeAuth
} from '@/api/auth';
import { initializeDatabase } from '@/api/database';
import { 
    deleteProviderById,
    deleteProvidersByIds,
    getProviders,
    getProvidersByIds,
    getProviderById,
    getProviderByProvidername,
    getProviderEmailAddressesByProviderIds,
    getProviderAddressesByProviderIds
} from '@/api/providers';
import { PostgresConfiguration } from '@/models/configuration';
import { provider } from '@innobridge/shared';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

const initializeApis = () => {
    if (!CLERK_SECRET_KEY) {
        throw new Error('CLERK_SECRET_KEY is not set in the environment variables');
    }
    initializeAuth(CLERK_SECRET_KEY);
    const config = {
        connectionString: DATABASE_URL
    } as PostgresConfiguration;
    initializeDatabase(config);
};

const clearProvidersTest = async () => {
    console.log('Starting clearProvidersTest ...');
    const providersBeforeClear = await getProviders();
    const providerIds = providersBeforeClear.map(provider => provider.id);
    await deleteProvidersByIds(providerIds);
    const providersAfterClear = await getProviders();
    console.log('Providers after clear: ', JSON.stringify(providersAfterClear, null, 2));
    console.log('clearProvidersTest completed');
}

const getProvidersTest = async (): Promise<provider.Provider[]> => {
    console.log('Starting getProvidersTest ...');
    const providers = await getProviders();
    // console.log('Providers: ', JSON.stringify(providers, null, 2));
    console.log('getProvidersTest completed');
    return providers;
};

const getProvidersByIdsTest = async (providerIds: string[]) => {
    console.log('Starting getProvidersByIdsTest ...');
    const providersByIds = await getProvidersByIds(providerIds);
    console.log('Providers by IDs: ', JSON.stringify(providersByIds, null, 2));
    console.log('getProvidersByIdsTest completed');
};

const getProviderByIdTest = async (providerId: string) => {
    console.log('Starting getProviderByIdTest ...');
    const provider = await getProviderById(providerId);
    console.log('Provider by ID: ', JSON.stringify(provider, null, 2));
    console.log('getProviderByIdTest completed');
};

const getProviderByProvidernameTest = async (providerName: string) => {
    console.log('Starting getProviderByProvidernameTest ...');
    console.log("providerName: ",   providerName);
    const provider = await getProviderByProvidername(providerName);
    console.log('Provider by Provider Name: ', JSON.stringify(provider, null, 2));
    console.log('getProviderByProvidernameTest completed');
};

const getProviderEmailAddressesByProviderIdsTest = async (providerIds: string[]) => {
    console.log('Starting getProviderEmailAddressesByProviderIdsTest ...');
    const emailAddresses = await getProviderEmailAddressesByProviderIds(providerIds);
    console.log('Email Addresses by Provider IDs: ', JSON.stringify(emailAddresses, null, 2));
    console.log('getProviderEmailAddressesByProviderIdsTest completed');
};

const getProviderAddressesByProviderIdsTest = async (providerIds: string[]) => {
    console.log('Starting getProviderAddressesByProviderIdsTest ...');
    const addresses = await getProviderAddressesByProviderIds(providerIds);
    console.log('Addresses by Provider IDs: ', JSON.stringify(addresses, null, 2));
    console.log('getProviderAddressesByProviderIdsTest completed');
};

const deleteProviderByIdTest = async (providerId: string) => {
    console.log('Starting deleteProviderByIdTest ...');
    await deleteProviderById(providerId);
    console.log('deleteProviderByIdTest completed');
};

(async function main() {
    try {
        // sync test
        initializeApis();
        // clearProvidersTest();

        const providers = await getProvidersTest();
        console.log('Providers: ', JSON.stringify(providers, null, 2));

        const providerIds = providers.map(provider => provider.id);
        await getProvidersByIdsTest(providerIds);
        await getProviderByIdTest(providerIds[0]);
        // await getProviderByProvidernameTest(providers[0].providerName!);
        await getProviderEmailAddressesByProviderIdsTest(providerIds);
        await getProviderAddressesByProviderIdsTest(providerIds);

        // promise tests in order
        console.log("🎉 All integration tests passed");
    } catch (err) {
        console.error("❌ Integration tests failed:", err);
        process.exit(1);
    }
})();