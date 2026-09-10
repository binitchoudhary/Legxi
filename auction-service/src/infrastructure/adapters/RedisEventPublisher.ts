import { IEventPublisher } from '../../application/ports/IEventPublisher';
import Redis from 'ioredis';
import { logger } from '../../shared/logger';

export class RedisEventPublisher implements IEventPublisher {
  constructor(
    private readonly redisClient: Redis,
    private readonly redisPublisher: Redis
  ) {}

  async publish(topic: string, payload: any): Promise<void> {
    try {
      const auctionId = payload.auctionId || payload.id;
      
      if (!auctionId) {
        // Not an auction-specific event, publish directly
        await this.redisPublisher.publish(topic, JSON.stringify(payload));
        return;
      }

      const sequenceKey = `auction:${auctionId}:seq`;
      let sequence: number | null = null;
      
      try {
        sequence = await this.redisClient.incr(sequenceKey);
      } catch (incrErr) {
        logger.error(
          { err: incrErr, auctionId, topic }, 
          'Redis INCR failed. No sequence allocated, aborting publish. Permanent transport-sequence gap.'
        );
        return;
      }

      // We explicitly map the domain events to the Socket.io expected envelope format
      const envelope = {
        auctionId,
        sequence,
        version: payload.version,
        timestamp: new Date().toISOString(),
        type: topic,
        payload
      };

      const channel = `auction:${auctionId}:events`;
      await this.redisPublisher.publish(channel, JSON.stringify(envelope));

    } catch (error) {
      logger.error(
        { err: error, topic }, 
        'Redis publish failed after sequence allocation (permanent gap)'
      );
    }
  }
}
