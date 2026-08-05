import { Socket } from 'socket.io';
import { IdentityContextProvider } from '../../modules/auth/adapters/identityContext.provider';
import { logger } from '../../shared/logger';

export const socketAuthenticator = (provider: IdentityContextProvider) => {
  return async (socket: Socket, next: (err?: Error) => void) => {
    try {
      // Read x-user-context from HTTP headers injected by Next.js Gateway
      const contextHeader = socket.handshake.headers['x-user-context'];

      if (!contextHeader || typeof contextHeader !== 'string') {
        logger.warn({ socketId: socket.id }, 'Socket connection rejected: missing x-user-context');
        return next(new Error('Authentication Error: Missing x-user-context'));
      }

      const userContext = provider.provide(contextHeader);

      if (!userContext || !userContext.user || !userContext.user.id || !Array.isArray(userContext.user.roles)) {
        logger.warn({ socketId: socket.id }, 'Socket connection rejected: structurally invalid user context');
        return next(new Error('Authentication Error: Invalid identity'));
      }

      // Bind to socket
      socket.data.userContext = userContext;
      next();
    } catch (err) {
      logger.warn({ socketId: socket.id, err }, 'Socket connection rejected: parse failed');
      next(new Error('Authentication Error: Parse failed'));
    }
  };
};
