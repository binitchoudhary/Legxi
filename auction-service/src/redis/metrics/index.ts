import { logger } from '../../shared/logger';

export class RedisMetrics {
  static recordCacheHit(namespace: string) {
    logger.info({ metric: 'cache_hit', namespace }, 'Redis Cache Hit');
  }

  static recordCacheMiss(namespace: string) {
    logger.info({ metric: 'cache_miss', namespace }, 'Redis Cache Miss');
  }

  static recordLockAcquired(lockName: string, durationMs: number) {
    logger.info({ metric: 'lock_acquired', lockName, durationMs }, 'Redis Lock Acquired');
  }

  static recordLockTimeout(lockName: string) {
    logger.warn({ metric: 'lock_timeout', lockName }, 'Redis Lock Timeout');
  }

  static recordPubSubPublish(channel: string, payloadSize: number) {
    logger.info({ metric: 'pubsub_publish', channel, payloadSize }, 'Redis Pub/Sub Publish');
  }

  static recordPubSubReceive(channel: string) {
    logger.info({ metric: 'pubsub_receive', channel }, 'Redis Pub/Sub Receive');
  }

  static recordStreamWrite(stream: string) {
    logger.info({ metric: 'stream_write', stream }, 'Redis Stream Write');
  }

  static recordStreamRead(stream: string, count: number) {
    logger.info({ metric: 'stream_read', stream, count }, 'Redis Stream Read');
  }

  static recordLuaExecution(scriptName: string, durationMs: number) {
    logger.info({ metric: 'lua_execution', scriptName, durationMs }, 'Redis Lua Script Executed');
  }
}
