import { PoolClient } from 'pg';
import { UserPostgresClient } from '@/storage/persistent/user_postgres_client';
import { ConnectionsDatabaseClient } from '@/storage/persistent/connections_database_client';
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
    GET_CONNECTION_BY_USER_IDS_PAIR_QUERY,
    GET_CONNECTIONS_BY_USER_ID_QUERY,
    ADD_CONNECTION_QUERY,
    DELETE_CONNECTION_BY_ID_QUERY
} from '@/storage/persistent/queries';
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
    };

    async createConnectionRequestTable(client: PoolClient): Promise<void> {
      await this.queryWithClient(client, CREATE_CONNECTION_REQUESTS_TABLE_QUERY);    
    };

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
            const result = await this.query(ADD_CONNECTION_REQUEST_QUERY, [requesterId, receiverId, greetingText]);
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
            await this.queryWithClient(client, ADD_CONNECTION_QUERY, [
                request.requesterId, 
                request.receiverId
            ]);
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

    async getConnectionByUserIdsPair(userId1: string, userId2: string): Promise<Connection | null> {
        try {
            const result = await this.query(GET_CONNECTION_BY_USER_IDS_PAIR_QUERY, [userId1, userId2]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            const connection: Connection = {
                connectionId: row.connection_id,
                userId1: row.user_id1,
                userId2: row.user_id2,
                connectedAt: row.connected_at,
            };
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
                const connection: Connection = {
                    connectionId: row.connection_id,
                    userId1: row.user_id1,
                    userId2: row.user_id2,
                    connectedAt: new Date(row.connected_at).getTime(),
                };
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
        receiverId: row.receiver_id,
        greetingText: row.greeting_text,
        status: row.status as ConnectionRequestStatus,
        createdAt: new Date(row.created_at).getTime(),
        respondedAt: row.responded_at ? new Date(row.responded_at).getTime() : null
    };
}

export { 
    ConnectionsPostgresClient 
};