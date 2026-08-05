import Redis from 'ioredis';
import { RedisSerializer, RedisDeserializer } from '../serialization';
import { RedisMetrics } from '../metrics';
import { logger } from '../../shared/logger';

export class StreamManager {
  constructor(private client: Redis) {}

  /**
   * Initializes a consumer group for a stream. If the stream doesn't exist, it creates it.
   */
  async createConsumerGroup(stream: string, group: string): Promise<void> {
    try {
      await this.client.xgroup('CREATE', stream, group, '$', 'MKSTREAM');
    } catch (err) {
      if (!(err as Error).message.includes('BUSYGROUP')) {
        throw err;
      }
    }
  }

  /**
   * Adds a message to a stream with an optional maximum length.
   */
  async add<T>(stream: string, payload: T, maxLen: number = 10000): Promise<string> {
    const serialized = RedisSerializer.serialize(payload);
    const id = await this.client.xadd(stream, 'MAXLEN', '~', maxLen, '*', 'payload', serialized);
    RedisMetrics.recordStreamWrite(stream);
    return id as string;
  }

  /**
   * Acknowledges processing of a message in a consumer group.
   */
  async ack(stream: string, group: string, messageId: string): Promise<void> {
    await this.client.xack(stream, group, messageId);
  }

  /**
   * Moves a message to a Dead Letter Queue (DLQ).
   */
  async moveToDLQ(stream: string, group: string, messageId: string, payload: any): Promise<void> {
    const dlqStream = `${stream}:dlq`;
    await this.add(dlqStream, { originalId: messageId, group, payload });
    await this.ack(stream, group, messageId);
    logger.warn({ stream, group, messageId }, 'Message moved to DLQ');
  }

  /**
   * Claims pending messages that have been idle for too long (abandoned by a crashed consumer).
   */
  async claimAbandoned(stream: string, group: string, consumer: string, minIdleTimeMs: number): Promise<any[]> {
    // XAUTOCLAIM returns [cursor, array of messages, array of deleted message ids]
    const result = await this.client.xautoclaim(stream, group, consumer, minIdleTimeMs, '0-0', 'COUNT', 10);
    return result[1] as any[];
  }
}
