import { UserRole } from '@prisma/client';

export interface JwtUser {
  id: string;
  storeId: string | null;
  role: UserRole;
}
