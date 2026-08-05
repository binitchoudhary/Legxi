import Redis from 'ioredis';
import crypto from 'crypto';
import { LuaRegistry } from '../lua/LuaRegistry';
import { RedisMetrics } from '../metrics';
import { InfrastructureError } from '../../shared/errors';

export class DistributedLock {
  constructor(
    private client: Redis,
    private luaRegistry: LuaRegistry
  ) {}

  /**
   * Generates a cryptographically secure token for the lock.
   */
  private generateToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Attempts to acquire a distributed lock.
   * @param key The Redis key for the lock.
   * @param ttlMs Time-to-live in milliseconds.
   * @param retries Number of retry attempts if lock is held.
   * @param retryDelayMs Delay between retries in milliseconds.
   * @returns The lock token if successful, null otherwise.
   */
  async acquire(key: string, ttlMs: number, retries: number = 3, retryDelayMs: number = 50): Promise<string | null> {
    const token = this.generateToken();
    const start = Date.now();

    for (let i = 0; i < retries; i++) {
      const result = await this.client.set(key, token, 'PX', ttlMs, 'NX');
      
      if (result === 'OK') {
        RedisMetrics.recordLockAcquired(key, Date.now() - start);
        return token;
      }
      
      await new Promise(resolve => setTimeout(resolve, retryDelayMs));
    }
    
    RedisMetrics.recordLockTimeout(key);
    return null;
  }

  /**
   * Releases a distributed lock using a secure Lua script to prevent accidental release
   * of a lock acquired by another process after a timeout.
   */
  async release(key: string, token: string): Promise<boolean> {
    if (!token) {
      throw new InfrastructureError('Unlock attempted without a valid lock token');
    }

    // Execute the 'releaseLock' script which checks token ownership before deletion.
    const result = await this.luaRegistry.execute('releaseLock', [key], [token]);
    return result === 1;
  }
}
