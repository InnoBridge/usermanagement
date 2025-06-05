import { Pool, PoolClient, QueryResult } from 'pg';
import { BaseDatabaseClient } from '@/storage/persistent/base_database_client';
import {
    CREATE_VERSION_TABLE_QUERY,
    GET_SCHEMA_VERSION_QUERY,
    UPDATE_SCHEMA_VERSION_QUERY,

} from '@/storage/queries';
import { PostgresConfiguration } from '@/models/configuration';

class BasePostgresClient implements BaseDatabaseClient {
    protected pool: Pool;
    // Add to PostgresClient class
    protected migrations: Map<number, (client: PoolClient) => Promise<void>> = new Map();

    constructor(config: PostgresConfiguration) {
        this.pool = new Pool(config);
    };

    async query(text: string, params?: any[]): Promise<QueryResult> {
        const client = await this.pool.connect();
        try {
            return await client.query(text, params);
        } finally {
            client.release();
        }
    };

    async queryWithClient(client: PoolClient, text: string, params?: any[]): Promise<QueryResult>  {
        return await client.query(text, params);
    };

    // Public method to register migrations
    registerMigration(fromVersion: number, migrationFn: (client: PoolClient) => Promise<void>): void {
        this.migrations.set(fromVersion, migrationFn);
    };


    // Update initializeDatabase to use registered migrations
    async initializeDatabase(): Promise<void> {
        const client = await this.pool.connect();
        try {
            await this.queryWithClient(client, 'BEGIN');
            
            await this.queryWithClient(client, CREATE_VERSION_TABLE_QUERY);
            const versionResult = await this.queryWithClient(client, GET_SCHEMA_VERSION_QUERY);
            let currentVersion = versionResult.rows[0].version;
            
            // Apply migrations in order
            while (this.migrations.has(currentVersion)) {
                console.log(`Upgrading from version ${currentVersion} to ${currentVersion + 1}`);
                const migration = await this.migrations.get(currentVersion);
                await migration!(client);
                currentVersion++;
                await this.queryWithClient(client, UPDATE_SCHEMA_VERSION_QUERY, [currentVersion]);
            }
            
            console.log(`Database schema is at version ${currentVersion}`);
            await this.queryWithClient(client, 'COMMIT');
        } catch (error) {
            await this.queryWithClient(client, 'ROLLBACK');
            console.error('Database initialization failed:', error);
            throw error;
        } finally {
            client.release();
        }
    };




    async shutdown() {
        await this.pool.end();
    };
}

export {
    BasePostgresClient
};