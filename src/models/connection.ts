enum ConnectionRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELED = 'canceled'
};

interface Connection {
  connectionId: number;
  userId1: string;
  userId2: string;
  connectedAt: number; // Also changed to Date for consistency
};

interface ConnectionRequest {
  requestId: number;
  requesterId: string;
  receiverId: string;
  greetingText?: string | null;
  status: ConnectionRequestStatus;
  createdAt: number;
  respondedAt?: number | null;
};

export {
  ConnectionRequestStatus,
  Connection,
  ConnectionRequest
};