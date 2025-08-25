import { EmailAddress } from "@/models/email";
import { Address } from "./address";

interface User {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  emailAddresses: EmailAddress[];
  address?: Address;
  passwordEnabled: boolean;
  twoFactorEnabled: boolean;
  backupCodeEnabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export {
    User
};