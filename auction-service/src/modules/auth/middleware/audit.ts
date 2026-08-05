import { FastifyRequest, FastifyReply } from 'fastify';
import { UserContext } from '../interfaces';

export async function auditContext(request: FastifyRequest, reply: FastifyReply) {
  const req = request as FastifyRequest & { userContext?: UserContext };
  
  if (req.userContext) {
    const { user } = req.userContext;
    request.log = request.log.child({
      userId: user.id,
      roles: user.roles,
      // auctionId: (request.params as any)?.auctionId // Add if route contains auctionId
    });
  }
}
