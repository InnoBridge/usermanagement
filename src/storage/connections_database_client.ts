import { UserDatabaseClient } from '@/storage/user_database_client';
import { ConnectionRequest, Connection } from '@/models/connection';

interface ConnectionsDatabaseClient extends UserDatabaseClient {
    getConnectionRequestsByUserId(userId: string): Promise<ConnectionRequest[]>;
    createConnectionRequest(requesterId: string, receiverId: string, greetingText?: string): Promise<ConnectionRequest>;
    cancelConnectionRequest(requestId: number, requesterId: string): Promise<ConnectionRequest | null>;
    acceptConnectionRequest(requestId: number, receiverId: string): Promise<ConnectionRequest | null>;
    rejectConnectionRequest(requestId: number, receiverId: string): Promise<ConnectionRequest | null>;
    deleteConnectionRequest(requestId: number): Promise<void>;
    getConnectionById(connectionId: number): Promise<Connection | null>;
    getConnectionByUserIdsPair(userId1: string, userId2: string): Promise<Connection | null>;
    getConnectionsByUserId(userId: string): Promise<Connection[]>;
    deleteConnectionById(connectionId: number): Promise<void>;
};

export {
    ConnectionsDatabaseClient,
};