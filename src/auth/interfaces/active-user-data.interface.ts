import { UserRole } from '../../users/entities/user.entity';

export interface ActiveUserData {
  userId: string;
  email: string;
  role: UserRole;
}
