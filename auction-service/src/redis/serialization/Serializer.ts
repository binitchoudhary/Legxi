import { InfrastructureError } from '../../shared/errors';

export class RedisSerializer {
  /**
   * Safely serializes an object to a JSON string.
   */
  static serialize<T>(data: T): string {
    if (data === undefined) {
      throw new InfrastructureError('Cannot serialize undefined value for Redis');
    }
    
    try {
      return JSON.stringify(data);
    } catch (error) {
      throw new InfrastructureError(`Failed to serialize data for Redis: ${(error as Error).message}`);
    }
  }
}
