import { EmailAddress } from "@/models/email";
import { address } from "@innobridge/shared";

interface User {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  emailAddresses: EmailAddress[];
  phoneNumber: string | null;
  languages: string[];
  address?: address.Address;
  passwordEnabled: boolean;
  twoFactorEnabled: boolean;
  backupCodeEnabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export {
    User
};