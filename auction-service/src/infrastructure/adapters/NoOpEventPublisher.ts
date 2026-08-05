import { IEventPublisher } from '../../application/ports/IEventPublisher';
import { logger } from '../../shared/logger';

export class NoOpEventPublisher implements IEventPublisher {
  async publish(topic: string, payload: any): Promise<void> {
    logger.debug({ topic, payload }, 'NoOpEventPublisher: Domain Event Published');
  }
}
