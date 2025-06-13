import { PoolClient } from 'pg';
import { UserPostgresClient } from '@/storage/user_postgres_client';
import { ConnectionsDatabaseClient } from '@/storage/connections_database_client';
import {
    CREATE_CONNECTION_REQUESTS_PAIR_INDEX_QUERY,
    ADD_NO_SELF_REQUESTS_CHECK_QUERY,
    ADD_USER_ORDER_CHECK_QUERY,
    CREATE_UNIQUE_CONNECTIONS_PAIR_INDEX_QUERY,
    CREATE_CONNECTIONS_TABLE_QUERY,
    CREATE_CONNECTION_REQUESTS_TABLE_QUERY,
    GET_CONNECTION_REQUESTS_BY_USER_ID_QUERY,
    ADD_CONNECTION_REQUEST_QUERY,
    UPDATE_CONNECTION_REQUEST_TO_CANCELED_QUERY,
    UPDATE_CONNECTION_REQUEST_STATUS_BY_RECEIVER_QUERY,
    DELETE_CONNECTION_REQUEST_QUERY,
    GET_CONNECTION_BY_ID_QUERY,
    GET_CONNECTION_BY_USER_IDS_PAIR_QUERY,
    GET_CONNECTIONS_BY_USER_ID_QUERY,
    ADD_CONNECTION_QUERY,
    DELETE_CONNECTION_BY_ID_QUERY
} from '@/storage/queries';
import { PostgresConfiguration } from '@/models/configuration';
import { Connection, ConnectionRequest, ConnectionRequestStatus } from '@/models/connection';

class ConnectionsPostgresClient extends UserPostgresClient implements ConnectionsDatabaseClient {

    constructor(config: PostgresConfiguration) {
        super(config);

        // Register migration for connections table
        this.registerMigration(1, async (client) => {
            await this.createConnectionsTable(client);
            await this.createConnectionRequestTable(client);
            await this.queryWithClient(client, CREATE_CONNECTION_REQUESTS_PAIR_INDEX_QUERY);
            await this.queryWithClient(client, ADD_NO_SELF_REQUESTS_CHECK_QUERY);
            await this.queryWithClient(client, ADD_USER_ORDER_CHECK_QUERY);
            await this.queryWithClient(client, CREATE_UNIQUE_CONNECTIONS_PAIR_INDEX_QUERY);
        });
    }

    async createConnectionsTable(client: PoolClient): Promise<void> {
        await this.queryWithClient(client, CREATE_CONNECTIONS_TABLE_QUERY);
    }

    async createConnectionRequestTable(client: PoolClient): Promise<void> {
      await this.queryWithClient(client, CREATE_CONNECTION_REQUESTS_TABLE_QUERY);    
    }

    async getConnectionRequestsByUserId(userId: string): Promise<ConnectionRequest[]> {
        try {
            const result = await this.query(GET_CONNECTION_REQUESTS_BY_USER_ID_QUERY, [userId]);
            const requests: ConnectionRequest[] = [];
            for (const row of result.rows) {
                const request: ConnectionRequest = mapToConnectionRequest(row);
                requests.push(request);
            }
            return requests;
        } catch (error) {
            console.error("Error getting connection requests by user ID:", error);
            throw error;
        }
    }

    async createConnectionRequest(requesterId: string, receiverId: string, greetingText?: string): Promise<ConnectionRequest> {
        try {
            // Get requester and receiver user data
            const requester = await this.getUserById(requesterId);
            const receiver = await this.getUserById(receiverId);

            if (!requester || !receiver) {
                throw new Error("Requester or receiver user not found.");
            }

            const result = await this.query(ADD_CONNECTION_REQUEST_QUERY, [
                requesterId, 
                requester.username,
                requester.firstName,
                requester.lastName,
                requester.imageUrl || null, // Ensure consistent null handling
                receiverId,
                receiver.username,
                receiver.firstName,
                receiver.lastName,
                receiver.imageUrl || null, // Ensure consistent null handling
                greetingText
            ]);

            return mapToConnectionRequest(result.rows[0]);
        } catch (error: any) {
            console.error("Error creating connection request:", error.message);
            if (error.message.includes('duplicate key value violates unique constraint "uq_connection_requests_pair"')) { // Unique violation
                throw new Error("Connection request already exists between these users.");
            }
            throw error;
        }
    };

    // Cancel a connection request (only requester can cancel)
    async cancelConnectionRequest(requestId: number, requesterId: string): Promise<ConnectionRequest> {
        try {
            const result = await this.query(UPDATE_CONNECTION_REQUEST_TO_CANCELED_QUERY, [requestId, requesterId]);
            if (result.rows.length === 0) {
                throw new Error("Request not found or not pending, or wrong requester.");
            }
            return mapToConnectionRequest(result.rows[0]);
        } catch (error) {
            console.error("Error canceling connection request:", error);
            throw error;
        }
    };

    // Accept a connection request (only receiver can accept)
    async acceptConnectionRequest(requestId: number, receiverId: string): Promise<ConnectionRequest> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await this.queryWithClient(client, UPDATE_CONNECTION_REQUEST_STATUS_BY_RECEIVER_QUERY, [
                requestId, 
                receiverId, 
                ConnectionRequestStatus.ACCEPTED
            ]);
            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                throw new Error("Request not found, not pending, or wrong receiver.");
            }
            const request = mapToConnectionRequest(result.rows[0]);

            let addConnectionQueryParams = [];
            if (request.receiverId.localeCompare(request.requesterId) < 0) {
                addConnectionQueryParams = [
                    request.receiverId,      // user1
                    request.receiverUsername,
                    request.receiverFirstName,
                    request.receiverLastName,
                    request.receiverImageUrl || null, // Ensure consistent null handling
                    request.requesterId,     // user2
                    request.requesterUsername,
                    request.requesterFirstName,
                    request.requesterLastName,
                    request.requesterImageUrl || null // Ensure consistent null handling
                ];
            } else {
                addConnectionQueryParams = [
                    request.requesterId,     // user1
                    request.requesterUsername,
                    request.requesterFirstName,
                    request.requesterLastName,
                    request.requesterImageUrl || null, // Ensure consistent null handling
                    request.receiverId,      // user2
                    request.receiverUsername,
                    request.receiverFirstName,
                    request.receiverLastName,
                    request.receiverImageUrl || null // Ensure consistent null handlingf
                ];
            }

            await this.queryWithClient(client, ADD_CONNECTION_QUERY, addConnectionQueryParams);
            await client.query('COMMIT');
            return request;
        } catch (error) {
            await client.query('ROLLBACK');
            console.error("Error accepting connection request:", error);
            throw error;
        } finally {
            client.release();
        }
    };

    // Reject a connection request (only receiver can reject)
    async rejectConnectionRequest(requestId: number, receiverId: string): Promise<ConnectionRequest> {
        try {
            const result = await this.query(UPDATE_CONNECTION_REQUEST_STATUS_BY_RECEIVER_QUERY, [
                requestId, 
                receiverId, 
                ConnectionRequestStatus.REJECTED
            ]);
            if (result.rows.length === 0) {
                throw new Error("Request not found, not pending, or wrong receiver.");
            }
            return mapToConnectionRequest(result.rows[0]);
        } catch (error) {
            console.error("Error rejecting connection request:", error);
            throw error;
        }
    };

    async deleteConnectionRequest(requestId: number): Promise<void> {
        try {
            await this.query(DELETE_CONNECTION_REQUEST_QUERY, [requestId]);
        } catch (error) {
            console.error("Error deleting connection request:", requestId, error);
            throw error;
        }
    };

    async getConnectionById(connectionId: number): Promise<Connection | null> {
        try {
            const result = await this.query(GET_CONNECTION_BY_ID_QUERY, [connectionId]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            const connection: Connection = mapToConnection(row);
            return connection;
        } catch (error) {
            console.error("Error getting connection by ID:", error);
            throw error;
        }
    };

    async getConnectionByUserIdsPair(userId1: string, userId2: string): Promise<Connection | null> {
        try {
            const result = await this.query(GET_CONNECTION_BY_USER_IDS_PAIR_QUERY, [userId1, userId2]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            const connection: Connection = mapToConnection(row);
            return connection;
        } catch (error) {
            console.error("Error getting connection by user IDs pair:", error);
            throw error;
        }
    };

    async getConnectionsByUserId(userId: string): Promise<Connection[]> {
        try {
            const result = await this.query(GET_CONNECTIONS_BY_USER_ID_QUERY, [userId]);
            const connections: Connection[] = [];
            for (const row of result.rows) {
                const connection: Connection = mapToConnection(row);
                connections.push(connection);
            }
            return connections;
        } catch (error) {
            console.error("Error getting connections by user ID:", error);
            throw error;
        }
    };

    async deleteConnectionById(connectionId: number): Promise<void> {
        try {
            await this.query(DELETE_CONNECTION_BY_ID_QUERY, [connectionId]);
        } catch (error) {
            console.error("Error deleting connection by ID:", connectionId, error);
            throw error;
        }
    }
}

const mapToConnectionRequest = (row: any): ConnectionRequest => {
    return {
        requestId: row.request_id,
        requesterId: row.requester_id,
        requesterUsername: row.requester_username,
        requesterFirstName: row.requester_first_name,
        requesterLastName: row.requester_last_name,
        requesterImageUrl: row.requester_image_url || null, // Ensure consistent null handling
        receiverId: row.receiver_id,
        receiverUsername: row.receiver_username,
        receiverFirstName: row.receiver_first_name,
        receiverLastName: row.receiver_last_name,
        receiverImageUrl: row.receiver_image_url || null, // Ensure consistent null handling
        greetingText: row.greeting_text,
        status: row.status as ConnectionRequestStatus,
        createdAt: new Date(row.created_at).getTime(),
        respondedAt: row.responded_at ? new Date(row.responded_at).getTime() : null
    };
}

const mapToConnection = (row: any): Connection => {
    return {
        connectionId: row.connection_id,
        userId1: row.user_id1,
        userId1Username: row.user_id1_username,
        userId1FirstName: row.user_id1_first_name,
        userId1LastName: row.user_id1_last_name,
        userId1ImageUrl: row.user_id1_image_url || null, // Ensure consistent null handling
        userId2: row.user_id2,
        userId2Username: row.user_id2_username,
        userId2FirstName: row.user_id2_first_name,
        userId2LastName: row.user_id2_last_name,
        userId2ImageUrl: row.user_id2_image_url || null, // Ensure consistent null handling
        connectedAt: new Date(row.connected_at).getTime()
    };
};

export { 
    ConnectionsPostgresClient 
};