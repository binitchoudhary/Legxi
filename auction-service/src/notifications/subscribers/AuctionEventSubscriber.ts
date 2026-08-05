import { NotificationDispatcher } from '../engine/NotificationDispatcher';
import { TemplateEngine } from '../engine/TemplateEngine';
import { NotificationPayload } from '../types';
import { logger } from '../../shared/logger';

export class AuctionEventSubscriber {
  constructor(
    private dispatcher: NotificationDispatcher,
    private templateEngine: TemplateEngine
  ) {}

  async onAuctionCreated(event: any): Promise<void> {
    try {
      // In a real system, we'd fetch interested users or broadcast to a topic
      const recipientId = 'admin-user-id'; // Example recipient
      const eventId = event.id || 'evt_auction_created';
      const correlationId = event.correlationId || eventId;
      
      const body = this.templateEngine.render('auction_created', 'v1', { auctionId: event.auctionId });

      const payload: NotificationPayload = {
        recipientId,
        recipientContact: 'admin@example.com',
        subject: 'New Auction Created',
        body,
        channel: 'EMAIL'
      };

      await this.dispatcher.dispatch(correlationId, eventId, payload);
    } catch (error) {
      logger.error({ err: error }, 'Failed to process AuctionCreated event in Notification Engine');
    }
  }
}
