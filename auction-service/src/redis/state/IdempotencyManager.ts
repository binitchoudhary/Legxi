import Redis from 'ioredis';
import { RedisKeys } from '../keys/namespaces';

export class IdempotencyManager {
  constructor(private client: Redis) {}

  /**
   * Attempts to record an operation using SET NX.
   * If it succeeds, the operation is new. If it fails, it's a duplicate.
   * @param idempotencyKey The unique key for the operation.
   * @param ttlSeconds How long the idempotency key should be retained.
   * @returns boolean true if operation is new and can proceed.
   */
  async acquire(idempotencyKey: string, ttlSeconds: number = 86400): Promise<boolean> {
    const key = RedisKeys.idempotency(idempotencyKey);
    const result = await this.client.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }
}
