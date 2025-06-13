import * as dotenv from 'dotenv';
import path from 'path';
import { initializeDatabase } from '@/api/database';
import { PostgresConfiguration } from '@/models/configuration';
import { 
    getConnectionRequestsByUserId,
    createConnectionRequest, 
    deleteConnectionRequest, 
    getConnectionById,
    getConnectionByUserIdsPair,
    rejectConnectionRequest,
    acceptConnectionRequest,
    cancelConnectionRequest,
    getConnectionsByUserId,
    deleteConnectionById
} from '@/api/connections';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const DATABASE_URL = process.env.DATABASE_URL;
const USER1 = process.env.USER1;
const USER2 = process.env.USER2;
const NON_EXISTENT_USER = process.env.NON_EXISTENT_USER;

const initializeApis = () => {
    const config = {
        connectionString: DATABASE_URL
    } as PostgresConfiguration;
    initializeDatabase(config);
};

const createConnectionRequestNonExistentUserTest = async () => {
    console.log('Starting createConnectionRequestNonExistentUserTest ...');
    try {
        await createConnectionRequest(NON_EXISTENT_USER!, USER1!, 'Test connection request');
    } catch (error) {
        if (error instanceof Error && error.message.includes('Both requester and receiver must exist in the database.')) {
            console.log('✅ Successfully caught error for non-existent user:', error.message);
        } else {
            throw new Error(`Unexpected error: ${error}`);
        }
    }
};

const createConnectionRequestTest = async () => {
    console.log('Starting createConnectionRequestTest ...');
    try {
        const request = await createConnectionRequest(USER1!, USER2!, 'Test connection request');
        const requests = await getConnectionRequestsByUserId(USER1!);
        console.log('Connection request created with ID:', JSON.stringify(request, null, 2));
        console.log('Connection requests for USER1:', JSON.stringify(requests, null, 2));
        await deleteConnectionRequest(request.requestId);
        const remainingRequests = await getConnectionRequestsByUserId(USER1!);
        console.log('Remaining connection requests for USER1 after deletion:', JSON.stringify(remainingRequests, null, 2));
        console.log('createConnectionRequestTest completed');
    } catch (error) {
        console.error('Error in createConnectionRequestTest:', error);
        throw error;
    }
};

const createConnectionRequestAlreadyExistsTest = async () => {
    console.log('Starting createConnectionRequestAlreadyExistsTest ...');
    let request = null;
    try {
        request = await createConnectionRequest(USER1!, USER2!, 'Test connection request');
        await createConnectionRequest(USER1!, USER2!, 'Test connection request');
    } catch (error) {
        if (error instanceof Error && error.message.includes('Connection request already exists between these users.')) {
            console.log('✅ Successfully caught error for existing connection request:', error.message);
        } else {
            throw new Error(`Unexpected error: ${error}`);
        }
    } finally {
        if (request) {
            await deleteConnectionRequest(request.requestId);
        }
    }
};

const cancelConnectionRequestTest = async () => {
    console.log('Starting cancelConnectionRequestTest ...');
    let request = null;
    try {
        request = await createConnectionRequest(USER1!, USER2!, 'Test connection request');
        const canceledRequest = await cancelConnectionRequest(request.requestId, USER1!);
        const requests = await getConnectionRequestsByUserId(USER2!);
        console.log('Connection request canceled:', JSON.stringify(canceledRequest, null, 2));
        console.log('Connection request by receiver:', JSON.stringify(requests, null, 2));
        console.log('cancelConnectionRequestTest completed');
    } catch (error) {
        console.error('Error in cancelConnectionRequestTest:', error);
        throw error;
    } finally {
        if (request) {
            await deleteConnectionRequest(request.requestId);
        }
    }   
};

const rejectConnectionRequestTest = async () => {
    console.log('Starting rejectConnectionRequestTest ...');
    let request = null;
    try {
        request = await createConnectionRequest(USER1!, USER2!, 'Test connection request');
        const rejectedRequest = await rejectConnectionRequest(request.requestId, USER2!);
        const requests = await getConnectionRequestsByUserId(USER2!);
        console.log('Connection request rejected:', JSON.stringify(rejectedRequest, null, 2));
        console.log('Connection requests for USER2 after rejection:', JSON.stringify(requests, null, 2));
        console.log('rejectConnectionRequestTest completed');
    } catch (error) {
        console.error('Error in rejectConnectionRequestTest:', error);
        throw error;
    } finally {
        if (request) {
            await deleteConnectionRequest(request.requestId);
        }
    }
};

const acceptConnectionRequestTest = async () => {
    console.log('Starting acceptConnectionRequestTest ...');
    let request = null;
    let connection = null;
    try {
        request = await createConnectionRequest(USER1!, USER2!, 'Test connection request');
        const acceptedRequest = await acceptConnectionRequest(request.requestId, USER2!);
        console.log("Accepted connection request:", JSON.stringify(acceptedRequest, null, 2));
        connection = await getConnectionByUserIdsPair(USER1!, USER2!);
        console.log("Connection established:", JSON.stringify(connection, null, 2));
        const connections = await getConnectionsByUserId(USER1!);
        console.log('Connections for USER1 after acceptance:', JSON.stringify(connections, null, 2));
    } catch (error) {
        console.error('Error in acceptConnectionRequestTest:', error);
        throw error;
    } finally {
        if (request) {
            await deleteConnectionRequest(request.requestId);
            await deleteConnectionById(connection!.connectionId);
        }
    }
};

const getConnectionByIdTest = async () => {
    console.log('Starting getConnectionByIdTest ...');
    let connectionById = null;
    try {
        const connectionRequest = await createConnectionRequest(USER1!, USER2!, 'Test connection request');
        const acceptedRequest = await acceptConnectionRequest(connectionRequest.requestId, USER2!);
        const connectionsByIdPair = await getConnectionByUserIdsPair(USER1!, USER2!)
        connectionById = await getConnectionById(connectionsByIdPair!.connectionId);
        console.log('Connection by ID:', JSON.stringify(connectionById, null, 2));
        console.log('getConnectionByIdTest completed successfully');
    } catch (error) {
        console.error('Error in getConnectionByIdTest:', error);
        throw error;
    } finally {
        if (connectionById) {
            await deleteConnectionById(connectionById.connectionId);
        }
    }
}

(async function main() {
    try {
        // sync test
        initializeApis();

        // promise tests in order
        await createConnectionRequestNonExistentUserTest();
        await createConnectionRequestTest();
        await createConnectionRequestAlreadyExistsTest();
        await cancelConnectionRequestTest();
        await rejectConnectionRequestTest();
        await acceptConnectionRequestTest();
        await getConnectionByIdTest();
        console.log("🎉 All integration tests passed");
    } catch (err) {
        console.error("❌ Integration tests failed:", err);
        process.exit(1);
    }
})();