import Redis from 'ioredis';
import { RedisSerializer, RedisDeserializer } from '../serialization';
import { RedisMetrics } from '../metrics';

export class CacheManager {
  constructor(private client: Redis) {}

  /**
   * Sets a value in the cache with a mandatory TTL.
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const serialized = RedisSerializer.serialize(value);
    await this.client.set(key, serialized, 'EX', ttlSeconds);
  }

  /**
   * Retrieves a value from the cache.
   */
  async get<T>(key: string, namespace: string = 'default'): Promise<T | null> {
    const raw = await this.client.get(key);
    
    if (raw) {
      RedisMetrics.recordCacheHit(namespace);
      return RedisDeserializer.deserialize<T>(raw);
    }
    
    RedisMetrics.recordCacheMiss(namespace);
    return null;
  }

  /**
   * Deletes a value from the cache.
   */
  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }
}
