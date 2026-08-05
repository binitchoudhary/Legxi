import { FastifyRequest, FastifyReply } from 'fastify';
import { Role } from '../constants';
import { UserContext } from '../interfaces';
import { PermissionDenied, RoleMissing, AuthenticationRequired } from '../../../shared/errors';

function getUserContext(request: FastifyRequest): UserContext {
  const context = (request as FastifyRequest & { userContext?: UserContext }).userContext;
  if (!context) {
    throw new AuthenticationRequired('User context is missing. Are you authenticated?');
  }
  return context;
}

export function requireRole(allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { user } = getUserContext(request);
    
    const hasRole = user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      throw new RoleMissing(`Access requires one of the following roles: ${allowedRoles.join(', ')}`);
    }
  };
}

export async function canBid(request: FastifyRequest, reply: FastifyReply) {
  const { user } = getUserContext(request);
  if (!user.roles.includes(Role.VERIFIED_USER)) {
    throw new PermissionDenied('Only verified users can place bids');
  }
  if (!user.isActive) {
    throw new PermissionDenied('User account is not active');
  }
}

export async function canManageAuction(request: FastifyRequest, reply: FastifyReply) {
  const { user } = getUserContext(request);
  if (!user.roles.includes(Role.AUCTION_MANAGER) && !user.roles.includes(Role.SUPER_ADMIN)) {
    throw new PermissionDenied('You do not have permission to manage auctions');
  }
}

export async function canRefund(request: FastifyRequest, reply: FastifyReply) {
  const { user } = getUserContext(request);
  if (!user.roles.includes(Role.FINANCE_ADMIN) && !user.roles.includes(Role.SUPER_ADMIN)) {
    throw new PermissionDenied('You do not have permission to issue refunds');
  }
}

export async function canViewFinance(request: FastifyRequest, reply: FastifyReply) {
  const { user } = getUserContext(request);
  if (!user.roles.includes(Role.FINANCE_ADMIN) && !user.roles.includes(Role.SUPER_ADMIN)) {
    throw new PermissionDenied('You do not have permission to view financial data');
  }
}
