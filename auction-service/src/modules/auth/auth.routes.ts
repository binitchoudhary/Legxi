import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../database';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { AuthenticationRequired } from '../../shared/errors';
import { authenticateIdentity } from './middleware/authenticate';

export async function authRoutes(app: FastifyInstance) {
  
  const ARGON2_OPTIONS = {
    type: argon2.argon2id as 0 | 1 | 2,
    memoryCost: 65536, // 64 MB
    timeCost: 4,       // 4 iterations
    parallelism: 2,    // 2 threads
    hashLength: 32     // 256 bits
  };
  
  // Dummy hash to prevent timing attacks when user is not found
  const DUMMY_HASH = await argon2.hash('dummy_password_for_timing', ARGON2_OPTIONS);

  app.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as any;

    if (!email || !password) {
      throw new AuthenticationRequired('Email and password are required');
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    let isValid = false;
    if (user) {
      isValid = await argon2.verify(user.passwordHash, password);
    } else {
      // Dummy check to mitigate timing attacks
      await argon2.verify(DUMMY_HASH, password);
    }

    if (!user || !isValid) {
      request.log.warn({ event: 'AUTH_LOGIN_FAILURE', email }, 'Login failed: Invalid credentials');
      throw new AuthenticationRequired('Invalid credentials');
    }

    // Generate 256-bit opaque refresh token
    const plaintextToken = crypto.randomBytes(32).toString('hex');
    
    // Hash it for DB storage
    const tokenHash = await argon2.hash(plaintextToken, ARGON2_OPTIONS);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const tokenRecord = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        userAgent: request.headers['user-agent']?.substring(0, 512),
        ipAddress: request.ip
      }
    });

    request.log.info({ event: 'AUTH_LOGIN_SUCCESS', userId: user.id }, 'Login successful');

    // Return the user without the password hash
    const { passwordHash, ...userWithoutPassword } = user;

    return reply.status(200).send({
      user: userWithoutPassword,
      refreshToken: `${tokenRecord.id}.${plaintextToken}`
    });
  });

  app.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = request.body as any;

    if (!refreshToken) {
      throw new AuthenticationRequired('Refresh token is required');
    }

    // Since tokenHash is Argon2, we must look it up by ID.
    // The format of our plaintext token must be: `${id}.${randomHex}`
    const parts = refreshToken.split('.');
    if (parts.length !== 2) {
      throw new AuthenticationRequired('Invalid refresh token format');
    }
    const [id, secret] = parts;

    // We must use a transaction and atomic operations to prevent concurrent refresh
    const result = await prisma.$transaction(async (tx) => {
      const tokenRecord = await tx.refreshToken.findUnique({
        where: { id }
      });

      if (!tokenRecord) {
        throw new AuthenticationRequired('Invalid refresh token');
      }

      const isValid = await argon2.verify(tokenRecord.tokenHash, secret);
      if (!isValid) {
        request.log.warn({ event: 'AUTH_REFRESH_FAILURE', tokenId: id }, 'Invalid refresh token signature');
        throw new AuthenticationRequired('Invalid refresh token');
      }

      // Replay attack / revocation check
      if (tokenRecord.revokedAt !== null) {
        request.log.warn({ event: 'AUTH_REPLAY_DETECTED', tokenId: id, userId: tokenRecord.userId }, 'Replay attack detected! Revoking all sessions.');
        await prisma.refreshToken.updateMany({
          where: { userId: tokenRecord.userId, revokedAt: null },
          data: { revokedAt: new Date() }
        });
        throw new AuthenticationRequired('Session compromised. Please log in again.');
      }

      // Expiry check
      if (tokenRecord.expiresAt < new Date()) {
        request.log.info({ event: 'AUTH_REFRESH_EXPIRED', tokenId: id }, 'Refresh token expired');
        throw new AuthenticationRequired('Refresh token expired');
      }

      // Atomic update to ensure no concurrent request has used this token
      const updateResult = await tx.refreshToken.updateMany({
        where: { id, revokedAt: null },
        data: {
          revokedAt: new Date(),
          lastUsedAt: new Date()
        }
      });

      if (updateResult.count === 0) {
        // Another request beat us to it - treat as replay!
        request.log.warn({ event: 'AUTH_CONCURRENT_REPLAY', tokenId: id, userId: tokenRecord.userId }, 'Concurrent replay attack detected!');
        await prisma.refreshToken.updateMany({
          where: { userId: tokenRecord.userId, revokedAt: null },
          data: { revokedAt: new Date() }
        });
        throw new AuthenticationRequired('Session compromised. Please log in again.');
      }

      // Issue new token
      const newSecret = crypto.randomBytes(32).toString('hex');
      const newTokenHash = await argon2.hash(newSecret, ARGON2_OPTIONS);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const createdToken = await tx.refreshToken.create({
        data: {
          userId: tokenRecord.userId,
          tokenHash: newTokenHash,
          expiresAt,
          userAgent: request.headers['user-agent']?.substring(0, 512),
          ipAddress: request.ip
        }
      });

      // Link old token to new token
      await tx.refreshToken.update({
        where: { id },
        data: { replacedBy: createdToken.id }
      });

      return { createdToken, newSecret, tokenRecord };
    });

    request.log.info({ event: 'AUTH_REFRESH_SUCCESS', oldTokenId: id, newTokenId: result.createdToken.id, userId: result.tokenRecord.userId }, 'Token rotated successfully');

    const user = await prisma.user.findUnique({ where: { id: result.tokenRecord.userId }});
    if (!user) throw new AuthenticationRequired('User not found');
    const { passwordHash, ...userWithoutPassword } = user;

    return reply.status(200).send({
      user: userWithoutPassword,
      refreshToken: `${result.createdToken.id}.${result.newSecret}`
    });
  });

  app.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = request.body as any;

    if (!refreshToken) {
      return reply.status(204).send(); // Idempotent, don't throw
    }

    const parts = refreshToken.split('.');
    if (parts.length !== 2) {
      return reply.status(204).send();
    }
    const [id, secret] = parts;

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { id }
    });

    if (!tokenRecord || tokenRecord.revokedAt !== null) {
      return reply.status(204).send(); // Already revoked or not found
    }

    const isValid = await argon2.verify(tokenRecord.tokenHash, secret);
    if (!isValid) {
      return reply.status(204).send();
    }

    await prisma.refreshToken.update({
      where: { id },
      data: {
        revokedAt: new Date()
      }
    });

    request.log.info({ event: 'AUTH_LOGOUT_SUCCESS', tokenId: id, userId: tokenRecord.userId }, 'User logged out successfully');

    return reply.status(204).send();
  });

  app.get('/me', {
    preHandler: [authenticateIdentity]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userContext = (request as any).userContext;
    return reply.status(200).send({ user: userContext.user });
  });

}
