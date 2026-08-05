import { FastifyRequest, FastifyReply } from 'fastify';
import { UserContext } from '../interfaces';
import { IdentityContextProvider } from '../adapters/identityContext.provider';
import { AuthenticationRequired, InvalidIdentity } from '../../../shared/errors';

const provider = new IdentityContextProvider();

export async function authenticateIdentity(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const contextHeader = request.headers['x-user-context'];
  
  if (!contextHeader || typeof contextHeader !== 'string') {
    throw new AuthenticationRequired('Missing or malformed x-user-context header from upstream gateway');
  }

  let userContext: UserContext;

  try {
    userContext = provider.provide(contextHeader);
  } catch (error) {
    throw new InvalidIdentity('Upstream user context is not valid JSON');
  }

  // Structural validation
  if (!userContext || !userContext.user || !userContext.user.id || !Array.isArray(userContext.user.roles)) {
    throw new InvalidIdentity('Upstream user context is structurally invalid');
  }

  // Attach user context to the request for downstream processing
  (request as FastifyRequest & { userContext: UserContext }).userContext = userContext;
}
