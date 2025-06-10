import { SQLiteRunResult } from "@/models/sqllite";

interface CachedBaseClient {
    execAsync(query: string): Promise<void>;
    runAsync(query: string, params?: any[]): Promise<SQLiteRunResult>;
    getAllAsync<T>(query: string, params?: any[]): Promise<T[]>;
    beginTransaction(): Promise<void>;
    commitTransaction(): Promise<void>;
    rollbackTransaction(): Promise<void>;
    initializeCache(): Promise<void>;
    registerMigration(version: number, migration: () => Promise<void>): void;
};

export {
    CachedBaseClient,
}