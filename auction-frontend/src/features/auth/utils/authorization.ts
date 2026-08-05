import { UserPayload, UserRole } from '../store/authStore';

/**
 * Checks whether a user possesses one or more specified roles.
 * Client authorization is for UI/UX rendering only; server Fastify authorization is authoritative.
 */
export function hasRole(
  user: UserPayload | null,
  roles: UserRole | UserRole[]
): boolean {
  if (!user || !user.roles || user.roles.length === 0) {
    return false;
  }

  const roleArray = Array.isArray(roles) ? roles : [roles];
  return user.roles.some((r) => roleArray.includes(r));
}

/**
 * Checks whether a user is authorized to access a route/component requiring specific roles.
 */
export function canAccess(
  user: UserPayload | null,
  requiredRoles: UserRole[]
): boolean {
  if (requiredRoles.length === 0) {
    return true;
  }
  return hasRole(user, requiredRoles);
}
