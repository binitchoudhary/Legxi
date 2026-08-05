import { hasRole, canAccess } from '../utils/authorization';
import { UserPayload } from '../store/authStore';

describe('Authorization Helpers Unit Tests', () => {
  const adminUser: UserPayload = {
    id: 'usr_admin',
    email: 'admin@legxi.com',
    roles: ['ADMIN'],
  };

  const bidderUser: UserPayload = {
    id: 'usr_bidder',
    email: 'bidder@legxi.com',
    roles: ['BIDDER'],
  };

  const managerUser: UserPayload = {
    id: 'usr_mgr',
    email: 'manager@legxi.com',
    roles: ['MANAGER', 'BIDDER'],
  };

  describe('hasRole', () => {
    it('returns true when user has the exact single role', () => {
      expect(hasRole(adminUser, 'ADMIN')).toBe(true);
      expect(hasRole(bidderUser, 'BIDDER')).toBe(true);
    });

    it('returns false when user does not have the specified single role', () => {
      expect(hasRole(bidderUser, 'ADMIN')).toBe(false);
      expect(hasRole(adminUser, 'BIDDER')).toBe(false);
    });

    it('returns true when user matches one of multiple allowed roles', () => {
      expect(hasRole(managerUser, ['ADMIN', 'MANAGER'])).toBe(true);
      expect(hasRole(bidderUser, ['BIDDER', 'ADMIN'])).toBe(true);
    });

    it('returns false when user matches none of multiple allowed roles', () => {
      expect(hasRole(bidderUser, ['ADMIN', 'MANAGER'])).toBe(false);
    });

    it('returns false for null or undefined user', () => {
      expect(hasRole(null, 'ADMIN')).toBe(false);
    });

    it('returns false when user has empty roles array', () => {
      const userNoRoles: UserPayload = { id: 'usr_none', email: 'none@legxi.com', roles: [] };
      expect(hasRole(userNoRoles, 'ADMIN')).toBe(false);
    });
  });

  describe('canAccess', () => {
    it('returns true if no roles are required (public access)', () => {
      expect(canAccess(null, [])).toBe(true);
      expect(canAccess(bidderUser, [])).toBe(true);
    });

    it('returns true when user has one of the required roles', () => {
      expect(canAccess(adminUser, ['ADMIN', 'MANAGER'])).toBe(true);
      expect(canAccess(managerUser, ['ADMIN', 'MANAGER'])).toBe(true);
    });

    it('returns false when user lacks the required roles', () => {
      expect(canAccess(bidderUser, ['ADMIN', 'MANAGER'])).toBe(false);
      expect(canAccess(null, ['ADMIN'])).toBe(false);
    });
  });
});
