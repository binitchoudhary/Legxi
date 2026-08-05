import Redis from 'ioredis';
import { RedisKeys } from '../keys/namespaces';

export class SequenceService {
  constructor(private client: Redis) {}

  /**
   * Generates a globally unique, monotonically increasing sequence number.
   * Useful for deterministic event ordering across multiple application instances.
   */
  async next(sequenceType: string): Promise<number> {
    const key = RedisKeys.sequenceGlobal(sequenceType);
    return await this.client.incr(key);
  }
}
