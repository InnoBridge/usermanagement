import { DatabaseClient } from '@/storage/persistent/database_client';
import { PostgresClient } from '@/storage/persistent/postgres_client';
import { DatabaseConfiguration } from '@/models/configuration';
import { PoolClient } from 'pg';

let databaseClient: DatabaseClient | null = null;

const initializeDatabase = async (
    config: DatabaseConfiguration,
    registerMigrations?: Map<number, (client: PoolClient) => Promise<void>> 
): Promise<void> => {
    databaseClient = new PostgresClient(config);
    if (registerMigrations) {
        registerMigrations.forEach((migration, version) => {
            databaseClient?.registerMigration(version, migration);
        });
    }
    await databaseClient.initializeDatabase();
};

const isDatabaseClientSet = (): boolean => {
    return databaseClient !== null;
};

const queryWithClient = async (client: PoolClient, query: string, params?: any[]): Promise<any> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await databaseClient?.queryWithClient(client, query, params);
};

const query = async (query: string, params?: any[]): Promise<any> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await databaseClient?.query(query, params);
};

const shutdownDatabase = async (): Promise<void> => {
    if (isDatabaseClientSet()) {
        await databaseClient?.shutdown();
    }
};

export {
    initializeDatabase,
    isDatabaseClientSet,
    queryWithClient,
    query,
    shutdownDatabase
};