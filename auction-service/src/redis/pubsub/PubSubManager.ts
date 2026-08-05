import Redis from 'ioredis';
import { RedisSerializer, RedisDeserializer } from '../serialization';
import { RedisMetrics } from '../metrics';
import { MessageEnvelope } from './MessageEnvelope';
import { randomUUID } from 'crypto';

export class PubSubManager {
  private handlers: Map<string, (payload: any) => void> = new Map();

  constructor(
    private publisherClient: Redis,
    private subscriberClient: Redis
  ) {
    this.subscriberClient.on('message', (channel, message) => {
      this.handleMessage(channel, message);
    });
  }

  /**
   * Publishes a message to the specified channel.
   */
  async publish<T>(channel: string, payload: T): Promise<void> {
    const envelope: MessageEnvelope<T> = {
      id: randomUUID(),
      timestamp: Date.now(),
      payload,
    };
    
    const serialized = RedisSerializer.serialize(envelope);
    await this.publisherClient.publish(channel, serialized);
    RedisMetrics.recordPubSubPublish(channel, serialized.length);
  }

  /**
   * Subscribes to a channel with a handler.
   */
  async subscribe<T>(channel: string, handler: (payload: MessageEnvelope<T>) => void): Promise<void> {
    this.handlers.set(channel, handler as (payload: any) => void);
    await this.subscriberClient.subscribe(channel);
  }

  /**
   * Unsubscribes from a channel.
   */
  async unsubscribe(channel: string): Promise<void> {
    this.handlers.delete(channel);
    await this.subscriberClient.unsubscribe(channel);
  }

  private handleMessage(channel: string, message: string) {
    RedisMetrics.recordPubSubReceive(channel);
    const handler = this.handlers.get(channel);
    
    if (handler) {
      const envelope = RedisDeserializer.deserialize<MessageEnvelope<any>>(message);
      if (envelope) {
        handler(envelope);
      }
    }
  }
}
