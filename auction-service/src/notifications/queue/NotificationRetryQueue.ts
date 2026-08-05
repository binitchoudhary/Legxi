import { NotificationPayload, NotificationRecord } from '../types';
import { INotificationAuditStore } from '../ports/INotificationAuditStore';
import { NotificationDeadLetterQueue } from './NotificationDeadLetterQueue';
import { logger } from '../../shared/logger';

export class NotificationRetryQueue {
  private readonly MAX_RETRIES = 3;

  constructor(
    private auditStore: INotificationAuditStore,
    private dlq: NotificationDeadLetterQueue,
    private dispatcher: any // Lazy loading or interface to break circular dependency
  ) {}

  /**
   * Used to resolve the circular dependency with NotificationDispatcher
   */
  setDispatcher(dispatcher: any) {
    this.dispatcher = dispatcher;
  }

  async enqueue(record: NotificationRecord, payload: NotificationPayload): Promise<void> {
    if (record.retryCount >= this.MAX_RETRIES) {
      logger.error({ notificationId: record.notificationId }, 'Max retries exhausted. Sending to DLQ.');
      await this.auditStore.updateState(record.notificationId, 'DLQ', record.retryCount);
      await this.dlq.enqueue(record, payload, 'MAX_RETRIES_EXHAUSTED');
      return;
    }

    record.retryCount++;
    logger.info({ notificationId: record.notificationId, retryCount: record.retryCount }, 'Enqueuing for retry');
    
    // In a real system, we'd use BullMQ with delay here.
    // For this architecture phase, we simulate the retry loop immediately via dispatcher
    if (this.dispatcher) {
      // Small simulated delay before retry
      setTimeout(() => {
        this.dispatcher.processDelivery(record, payload).catch((err: any) => {
          logger.error({ err }, 'Retry processing failed');
        });
      }, 1000);
    }
  }
}
