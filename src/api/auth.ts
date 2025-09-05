import { 
    ClerkClient, 
    createClerkClient
} from '@clerk/backend';
import { User } from '@/models/user';
import { EmailAddress } from '@/models/email';

let client: ClerkClient | null = null;

const initializeAuth = (clerkSecretKey: string) => {
    client = createClerkClient({ secretKey: clerkSecretKey });
};

const getUserCount = async () => {
    if (!client) {
        throw new Error('Clerk client is not initialized. Call initializeClerkClient first.');
    }
    return await client.users.getCount();
};

const getUserList = async (limit: number, offset: number, updatedAfter?: number) => {
    if (!client) {
        throw new Error('Clerk client is not initialized. Call initializeClerkClient first.');
    }
    let queryParams: any = {
        limit: limit,
        offset: offset,
    };
    if (updatedAfter !== undefined) {
        queryParams = { ...queryParams, orderBy: '-updated_at' };
    }
    const result = await client.users.getUserList(queryParams);
    const users: User[] = [];
    for (const userData of result.data) {
        if (updatedAfter!==undefined && userData.updatedAt <= updatedAfter) {
            break;
        }
        const emailAddresses: EmailAddress[] = [];
        if (userData.emailAddresses.length > 0) {
            for (const email of userData.emailAddresses) {
                emailAddresses.push({
                    id: email.id,
                    userId: userData.id,
                    emailAddress: email.emailAddress
                });
            }
        }
        const user = {
            id: userData.id,
            username: userData.username || null,
            firstName: userData.firstName || null,
            lastName: userData.lastName || null,
            imageUrl: userData.imageUrl || '',
            phoneNumber: '',
            languages: [],
            emailAddresses: emailAddresses,
            passwordEnabled: userData.passwordEnabled || false,
            twoFactorEnabled: userData.twoFactorEnabled || false,
            backupCodeEnabled: userData.backupCodeEnabled || false,
            createdAt: userData.createdAt,
            updatedAt: userData.updatedAt,
        }
        users.push(user);
    }
    return users;
};

export {
    initializeAuth,
    getUserCount,
    getUserList,
}