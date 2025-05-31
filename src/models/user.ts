import { EmailAddress } from "@/models/email";

interface User {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  emailAddresses: EmailAddress[];
  passwordEnabled: boolean;
  twoFactorEnabled: boolean;
  backupCodeEnabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export {
    User
};