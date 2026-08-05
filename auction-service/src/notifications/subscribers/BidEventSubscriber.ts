import { NotificationDispatcher } from '../engine/NotificationDispatcher';
import { TemplateEngine } from '../engine/TemplateEngine';
import { NotificationPayload } from '../types';
import { logger } from '../../shared/logger';

export class BidEventSubscriber {
  constructor(
    private dispatcher: NotificationDispatcher,
    private templateEngine: TemplateEngine
  ) {}

  async onOutbid(event: any): Promise<void> {
    try {
      const recipientId = event.previousBidderId;
      const eventId = event.id || 'evt_outbid';
      const correlationId = event.correlationId || eventId;
      
      const body = this.templateEngine.render('outbid_alert', 'v1', { auctionId: event.auctionId, newAmount: event.newAmount });

      const payload: NotificationPayload = {
        recipientId,
        recipientContact: 'user@example.com', // In a real system, look this up or assume it's in the event/user profile
        subject: 'You have been outbid!',
        body,
        channel: 'EMAIL'
      };

      await this.dispatcher.dispatch(correlationId, eventId, payload);
    } catch (error) {
      logger.error({ err: error }, 'Failed to process Outbid event in Notification Engine');
    }
  }
}
