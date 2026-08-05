import { FastifyRequest, FastifyReply } from 'fastify';

export async function auditContextMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // Attach the current user identity context to the request logger for auditability
  const userContext = (request as any).userContext;
  if (userContext) {
    request.log = request.log.child({ 
      audit: {
        userId: userContext.user?.id,
        roles: userContext.user?.roles,
        sessionId: userContext.sessionId
      } 
    });
  }
}
