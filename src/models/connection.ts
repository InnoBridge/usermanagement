enum ConnectionRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELED = 'canceled'
};

interface Connection {
  connectionId: number;
  userId1: string;
  userId1Username: string;
  userId1FirstName: string;
  userId1LastName: string;
  userId1ImageUrl: string | null; // Changed to string | null for consistency
  userId2: string;
  userId2Username: string;
  userId2FirstName: string;
  userId2LastName: string;
  userId2ImageUrl: string | null; // Changed to string | null for consistency
  connectedAt: number; // Also changed to Date for consistency
};

interface ConnectionRequest {
  requestId: number;
  requesterId: string;
  requesterUsername: string;
  requesterFirstName: string;
  requesterLastName: string;
  requesterImageUrl?: string | null; // Optional field for requester image URL
  receiverId: string;
  receiverUsername: string;
  receiverFirstName: string;
  receiverLastName: string;
  receiverImageUrl?: string | null; // Optional field for receiver image URL
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