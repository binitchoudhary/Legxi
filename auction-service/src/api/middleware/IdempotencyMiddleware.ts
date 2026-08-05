import { FastifyRequest, FastifyReply } from 'fastify';
import { IdempotencyHeaderSchema } from '../dto/headers.dto';
import { IdempotencyManager } from '../../redis/state/IdempotencyManager';
import { RedisFactory } from '../../redis/client/RedisFactory';

// Lazily initialize or inject this properly in a real DI setup
const redisClient = RedisFactory.createClient();
const idempotencyManager = new IdempotencyManager(redisClient as any);

export async function requireIdempotency(request: FastifyRequest, reply: FastifyReply) {
  const headerRaw = request.headers['idempotency-key'];
  
  if (!headerRaw) {
    return reply.status(400).send({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Missing Idempotency-Key header' },
      meta: {
        requestId: request.id,
        traceId: (request as any).traceId || request.id,
        version: 'v1'
      }
    });
  }

  const result = IdempotencyHeaderSchema.safeParse({ 'idempotency-key': headerRaw });
  if (!result.success) {
    return reply.status(400).send({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid Idempotency-Key format, must be UUIDv4' },
      meta: {
        requestId: request.id,
        traceId: (request as any).traceId || request.id,
        version: 'v1'
      }
    });
  }

  const key = result.data['idempotency-key'];
  const acquired = await idempotencyManager.acquire(key, 86400); // 24h TTL

  if (!acquired) {
    return reply.status(409).send({
      success: false,
      error: { code: 'CONFLICT', message: 'Idempotency collision detected. Request is already processing or completed.' },
      meta: {
        requestId: request.id,
        traceId: (request as any).traceId || request.id,
        version: 'v1'
      }
    });
  }
}
