import { NotificationPayload, NotificationRecord } from '../types';
import { logger } from '../../shared/logger';

export class NotificationDeadLetterQueue {
  async enqueue(record: NotificationRecord, payload: NotificationPayload, reason: string): Promise<void> {
    // In a real implementation this would write to a separate DLQ database table or message queue
    logger.error({ 
      notificationId: record.notificationId, 
      correlationId: record.correlationId,
      eventId: record.eventId,
      reason 
    }, 'Notification moved to Dead Letter Queue');
  }
}
