import { InfrastructureError } from '../../shared/errors';

export class RedisDeserializer {
  /**
   * Safely deserializes a JSON string from Redis.
   */
  static deserialize<T>(data: string | null): T | null {
    if (data === null || data === undefined) {
      return null;
    }
    
    try {
      return JSON.parse(data) as T;
    } catch (error) {
      throw new InfrastructureError(`Failed to deserialize data from Redis: ${(error as Error).message}`);
    }
  }
}
