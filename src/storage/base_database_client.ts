import { PoolClient, QueryResult } from 'pg';

interface BaseDatabaseClient {
        queryWithClient(client: PoolClient, text: string, params?: any[]): Promise<QueryResult>;
        query(query: string, params?: any[]): Promise<any>;
        registerMigration(fromVersion: number, migrationFn: (client: PoolClient) => Promise<void>): void
        initializeDatabase(): Promise<void>;    
        shutdown(): Promise<void>;
};

export {
    BaseDatabaseClient,
};