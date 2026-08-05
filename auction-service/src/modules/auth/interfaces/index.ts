import { Role } from '../constants';

export interface IdentityProvider {
  verifyToken(token: string): Promise<AuthenticatedUser>;
  getUserRoles(userId: string): Promise<Role[]>;
}

export interface AuthenticatedUser {
  id: string;
  email?: string;
  emailVerified: boolean;
  claims: Record<string, unknown>;
}

export interface CurrentUser {
  id: string;
  roles: Role[];
  isActive: boolean;
}

export interface UserContext {
  user: CurrentUser;
  sessionId?: string;
  deviceId?: string;
}

export interface IdentityAdapter {
  authenticate(token: string): Promise<UserContext>;
}
