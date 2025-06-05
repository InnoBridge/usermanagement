import { isDatabaseClientSet, getDatabaseClient } from '@/api/database';
import { ConnectionRequest, Connection } from '@/models/connection';

const getConnectionRequestsByUserId = async (userId: string): Promise<ConnectionRequest[]> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.getConnectionRequestsByUserId(userId);
}

const createConnectionRequest = async (requesterId: string, receiverId: string, greetingText?: string): Promise<ConnectionRequest> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    const databaseClient = getDatabaseClient();
    const users = await databaseClient!.getUsersByIds([requesterId, receiverId]);
    if (users.length !== 2) {
        throw new Error("Both requester and receiver must exist in the database.");
    }
    const existingConnection = await databaseClient!.getConnectionByUserIdsPair(requesterId, receiverId);
    if (existingConnection) {
        throw new Error("Connection request already exists between these users.");
    }
    return await getDatabaseClient()!.createConnectionRequest(requesterId, receiverId, greetingText);
};

const cancelConnectionRequest = async (requestId: number, requesterId: string): Promise<ConnectionRequest | null> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.cancelConnectionRequest(requestId, requesterId);
};

const acceptConnectionRequest = async (requestId: number, receiverId: string): Promise<ConnectionRequest | null> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.acceptConnectionRequest(requestId, receiverId);
};

const rejectConnectionRequest = async (requestId: number, receiverId: string): Promise<ConnectionRequest | null> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.rejectConnectionRequest(requestId, receiverId);
};

const deleteConnectionRequest = async (requestId: number): Promise<void> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.deleteConnectionRequest(requestId);
};

const getConnectionByUserIdsPair = async (userId1: string, userId2: string): Promise<Connection | null> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.getConnectionByUserIdsPair(userId1, userId2);
};

const getConnectionsByUserId = async (userId: string): Promise<Connection[]> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.getConnectionsByUserId(userId);
};

const deleteConnectionById = async (connectionId: number): Promise<void> => {
    if (!isDatabaseClientSet()) {
        throw new Error("Database client not initialized. Call initializeDatabase first.");
    }
    return await getDatabaseClient()!.deleteConnectionById(connectionId);
};

export {
    getConnectionRequestsByUserId,
    createConnectionRequest,
    cancelConnectionRequest,
    acceptConnectionRequest,
    rejectConnectionRequest,
    deleteConnectionRequest,
    getConnectionByUserIdsPair,
    getConnectionsByUserId,
    deleteConnectionById
};