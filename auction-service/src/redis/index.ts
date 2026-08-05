import Redis from 'ioredis';
import { RedisFactory, RedisTopology } from './client/RedisFactory';
import { InfrastructureError } from '../shared/errors';
import { logger } from '../shared/logger';
import { RedisHealthMonitor } from './health/RedisHealthMonitor';
import { LuaRegistry } from './lua/LuaRegistry';
import { DistributedLock } from './locking/DistributedLock';
import { CacheManager } from './cache/CacheManager';
import { SequenceService } from './state/SequenceService';
import { IdempotencyManager } from './state/IdempotencyManager';
import { PubSubManager } from './pubsub/PubSubManager';
import { StreamManager } from './streams/StreamManager';

// Expose standard clients for the runtime
export const redisClient = RedisFactory.createClient(RedisTopology.STANDALONE, 'default') as Redis;
export const redisPublisher = RedisFactory.createClient(RedisTopology.STANDALONE, 'publisher') as Redis;
export const redisSubscriber = RedisFactory.createClient(RedisTopology.STANDALONE, 'subscriber') as Redis;

// Initialize Infrastructure
export const redisHealthMonitor = new RedisHealthMonitor(redisClient);
export const luaRegistry = new LuaRegistry(redisClient);
export const distributedLock = new DistributedLock(redisClient, luaRegistry);
export const cacheManager = new CacheManager(redisClient);
export const sequenceService = new SequenceService(redisClient);
export const idempotencyManager = new IdempotencyManager(redisClient);
export const pubSubManager = new PubSubManager(redisPublisher, redisSubscriber);
export const streamManager = new StreamManager(redisClient);

// Ensure scripts are registered on startup
redisClient.on('ready', () => {
  luaRegistry.registerScripts();
});

export async function checkRedisHealth(): Promise<boolean> {
  const health = await redisHealthMonitor.checkHealth();
  return health.status === 'ok';
}

export async function closeRedis(): Promise<void> {
  try {
    await Promise.all([
      redisClient.quit(),
      redisPublisher.quit(),
      redisSubscriber.quit()
    ]);
    logger.info('Redis clients disconnected gracefully');
  } catch (error) {
    logger.error({ err: error }, 'Error disconnecting redis');
    throw new InfrastructureError('Failed to disconnect redis');
  }
}
