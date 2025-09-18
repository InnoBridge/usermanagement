import * as dotenv from 'dotenv';
import path from 'path';
import { PostgresConfiguration } from '@/models/configuration';
import { ProviderDatabaseClient } from '@/storage/provider_database_client';
import { ProviderPostgresClient } from '@/storage/provider_postgres_client';
import { provider } from '@innobridge/shared';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const DATABASE_URL = process.env.DATABASE_URL;

const initializeDatabaseClient = (): ProviderDatabaseClient => {
    if (!DATABASE_URL) {
        throw new Error('DATABASE_URL is not set in the environment variables');
    }
    const config = {
        connectionString: DATABASE_URL
    } as PostgresConfiguration;
    return new ProviderPostgresClient(config);
}

const getLatestDateTest = async (client: ProviderDatabaseClient) => {
    console.log('Starting tests...');
    const latestDate = await client.getLatestProviderUpdate();
    console.log(`Latest provider update date: ${latestDate}`);
    console.log(`Epoch time: ${latestDate.getTime()}`);
};

const upsertProvidersTest = async (client: ProviderDatabaseClient) => {
    console.log('Starting upsert provider test...');
    const providers = [
        {
            id: 'provider_1',
            firstName: 'John',
            lastName: 'Doe',
            providerName: 'johndoe',
            imageUrl: 'https://example.com/john.jpg',
            emailAddresses: [
                { id: 'email_1', emailAddress: 'john@example.com' }
            ],
            phoneNumber: '+15550000001',
            languages: ['english'],
            passwordEnabled: true,
            twoFactorEnabled: false,
            backupCodeEnabled: false,
            createdAt: 1748655000000,
            updatedAt: 1748655000000,  // Most recent
            address: {
                id: 'addr_provider_1',
                providerId: 'provider_1',
                placeId: 'ChIJNeRxp0p1hlQR5Fornk9YLEk',
                name: '8400 Cook Rd',
                unitNumber: 'Unit 101',
                city: 'Richmond',
                province: 'British Columbia',
                country: 'CA',
                postalCode: 'V6Y 1V5',
                location: { lat: 49.166331, lng: -123.1306886 }
            },
            serviceRadius: 50,
            canVisitClientHome: true,
            virtualHelpOffered: false,
            businessName: 'Johns Services'
        },
        {
            id: 'provider_2',
            firstName: 'Jane',
            lastName: 'Smith',
            providerName: 'janesmith',
            imageUrl: 'https://example.com/jane.jpg',
            emailAddresses: [
                { id: 'email_2', emailAddress: 'jane@example.com' }
            ],
            phoneNumber: '+15550000002',
            languages: ['english','swedish'],
            passwordEnabled: true,
            twoFactorEnabled: true,
            backupCodeEnabled: true,
            createdAt: 1748654000000,
            updatedAt: 1748654000000,
            address: {
                id: 'addr_provider_2',
                providerId: 'provider_2',
                placeId: 'ChIJi6C1MxquhlQRm9V4KJ6aVAs',
                name: '123 Main St',
                unitNumber: undefined,
                city: 'Vancouver',
                province: 'British Columbia',
                country: 'CA',
                postalCode: 'V5K 0A1',
                location: { lat: 49.2827, lng: -123.1207 }
            },
            serviceRadius: 30,
            canVisitClientHome: false,
            virtualHelpOffered: true,
            businessName: 'Jane Smith Care'
        },
        {
            id: 'provider_3',
            firstName: 'Bob',
            lastName: null,
            providerName: null,
            imageUrl: 'https://example.com/bob.jpg',
            emailAddresses: [
                { id: 'email_3', emailAddress: 'bob@example.com' },
                { id: 'email_4', emailAddress: 'bob.work@example.com' }
            ],
            phoneNumber: null,
            languages: [],
            passwordEnabled: false,
            twoFactorEnabled: false,
            backupCodeEnabled: false,
            createdAt: 1748653000000,
            updatedAt: 1748653000000,
            address: null,
            serviceRadius: 0,
            canVisitClientHome: false,
            virtualHelpOffered: false,
            businessName: undefined
        },
        {
            id: 'provider_4',
            firstName: 'Alice',
            lastName: 'Johnson',
            providerName: 'alicej',
            imageUrl: 'https://example.com/alice.jpg',
            emailAddresses: [
                { id: 'email_5', emailAddress: 'alice@example.com' }
            ],
            phoneNumber: '+15550000004',
            languages: ['mandarin'],
            passwordEnabled: true,
            twoFactorEnabled: true,
            backupCodeEnabled: false,
            createdAt: 1748652000000,
            updatedAt: 1748652000000,
            address: {
                id: 'addr_provider_4',
                providerId: 'provider_4',
                placeId: null,
                name: '500 Market St',
                unitNumber: 'Suite 20',
                city: 'Toronto',
                province: 'Ontario',
                country: 'CA',
                postalCode: 'M5V 2T6',
                location: { lat: 43.6532, lng: -79.3832 }
            },
            serviceRadius: 25,
            canVisitClientHome: true,
            virtualHelpOffered: true,
            businessName: 'AliceJ Services'
        },
        {
            id: 'provider_5',
            firstName: 'Charlie',
            lastName: 'Brown',
            providerName: 'charlieb',
            imageUrl: 'https://example.com/charlie.jpg',
            emailAddresses: [
                { id: 'email_6', emailAddress: 'charlie@example.com' },
                { id: 'email_7', emailAddress: 'charlie.personal@gmail.com' }
            ],
            phoneNumber: '+15550000005',
            languages: ['english','mandarin'],
            passwordEnabled: false,
            twoFactorEnabled: false,
            backupCodeEnabled: true,
            createdAt: 1748651000000,
            updatedAt: 1748651000000,  // Oldest
            address: {
                id: 'addr_provider_5',
                providerId: 'provider_5',
                placeId: 'ChIJd8BlQ2BZwokRAFUEcm_qrcA',
                name: '742 Evergreen Terrace',
                unitNumber: undefined,
                city: 'Springfield',
                province: 'State',
                country: 'US',
                postalCode: '12345',
                location: { lat: 37.7749, lng: -122.4194 }
            },
            serviceRadius: 15,
            canVisitClientHome: false,
            virtualHelpOffered: false,
            businessName: 'Charlie B Homecare'
        }
    ] as provider.Provider[];
    await client.upsertProviders(providers);
    console.log('Providers upserted successfully');
};

const countProvidersTest = async (client: ProviderDatabaseClient) => {
    console.log('Starting provider count test...');
    const numberOfProviders = await client.countProviders(1748650000000);
    console.log(`Count of Providers : ${numberOfProviders}`);
    console.log('countProvidersTest completed successfully');
}

const getProviderEmailAddressesByProviderIdsTest = async (client: ProviderDatabaseClient) => {
    console.log('Starting getProviderEmailAddressesByProviderIds test...');
    const providerIds = ['provider_1', 'provider_2', 'provider_3', 'provider_4', 'provider_5'];
    const emailAddresses = await client.getProviderEmailAddressesByProviderIds(providerIds);
    console.log(`Email Addresses for Provider IDs ${providerIds.join(', ')}:`, emailAddresses);
    console.log('getProviderEmailAddressesByProviderIdsTest completed successfully');
}

const getProvidersTest = async (client: ProviderDatabaseClient) => {
    console.log('Starting getProviders test...');
    const providers = await client.getProviders();
    console.log(`Total Providers: ${providers.length}`);
    console.log('Provider Details:', JSON.stringify(providers, null, 2));
    console.log('getProvidersTest completed successfully');
}

const getProviderByProvidernameTest = async (client: ProviderDatabaseClient) => {
    console.log('Starting getProviderByProvidername test...');
    const providers = await client.getProviders();
    const provider = await client.getProviderByProvidername(providers[0].providerName!);
    console.log(`Provider found: ${provider ? JSON.stringify(provider, null, 2) : 'No provider found'}`);
    console.log('getProviderByProvidernameTest completed successfully');
}

const deleteProviderByIdTest = async (client: ProviderDatabaseClient) => {
    console.log('Starting deleteProviderById test...');
    const providerId = 'provider_1';
    const providersBeforeDelete = await client.getProviders();
    const providerEmailAddressesBeforeDelete = 
    await client.getProviderEmailAddressesByProviderIds(providersBeforeDelete.map(provider => provider.id));
    console.log('Providers before deletion: ', JSON.stringify(providersBeforeDelete, null, 2));
    console.log('Email Addresses before deletion: ', providerEmailAddressesBeforeDelete);
    await client.deleteProviderById(providerId);
    const providersAfterDelete = await client.getProviders();
    const providerEmailAddressesAfterDelete = 
        await client.getProviderEmailAddressesByProviderIds(providersAfterDelete.map(provider => provider.id));
    console.log('Providers after deletion: ', JSON.stringify(providersAfterDelete, null, 2));
    console.log('Email Addresses after deletion: ', providerEmailAddressesAfterDelete);
    console.log(`Provider with ID ${providerId} deleted successfully`);
};

const deleteProvidersByIdsTest = async (client: ProviderDatabaseClient) => {
    console.log('Starting deleteProvidersByIds test...');
    const providerIds = ['provider_2', 'provider_3', 'provider_4', 'provider_5'];
    const providersBeforeDelete = await client.getProviders();
    const providerEmailAddressesBeforeDelete = 
        await client.getProviderEmailAddressesByProviderIds(providersBeforeDelete.map(provider => provider.id));
    console.log('Providers before deletion: ', JSON.stringify(providersBeforeDelete, null, 2));
    console.log('Email Addresses before deletion: ', providerEmailAddressesBeforeDelete);
    await client.deleteProvidersByIds(providerIds);
    const providersAfterDelete = await client.getProviders();
    const providerEmailAddressesAfterDelete = 
        await client.getProviderEmailAddressesByProviderIds(providersAfterDelete.map(provider => provider.id));
    console.log('Providers after deletion: ', JSON.stringify(providersAfterDelete, null, 2));
    console.log('Email Addresses after deletion: ', providerEmailAddressesAfterDelete);
    console.log(`Providers with IDs ${providerIds.join(', ')} deleted successfully`);
}

(async function main() {
    try {
        // sync test
        const clerkClient = initializeDatabaseClient();

        // promise tests in order
        await upsertProvidersTest(clerkClient);
        await getLatestDateTest(clerkClient);
        await countProvidersTest(clerkClient);
        await getProviderEmailAddressesByProviderIdsTest(clerkClient);
        await getProvidersTest(clerkClient);
        await getProviderByProvidernameTest(clerkClient);
        await deleteProviderByIdTest(clerkClient);
        await deleteProvidersByIdsTest(clerkClient);

        console.log("🎉 All integration tests passed");
    } catch (err) {
        console.error("❌ Integration tests failed:", err);
        process.exit(1);
    }
})();