import { INotificationAuditStore } from '../ports/INotificationAuditStore';
import { IEmailProvider } from '../ports/IEmailProvider';
import { ISmsProvider } from '../ports/ISmsProvider';
import { IPushProvider } from '../ports/IPushProvider';
import { NotificationEligibilityPolicy } from '../policies/NotificationEligibilityPolicy';
import { NotificationPayload, NotificationRecord, ProviderError } from '../types';
import { NotificationRetryQueue } from '../queue/NotificationRetryQueue';
import { ulid } from 'ulidx';
import { logger } from '../../shared/logger';

export class NotificationDispatcher {
  constructor(
    private auditStore: INotificationAuditStore,
    private emailProvider: IEmailProvider,
    private smsProvider: ISmsProvider,
    private pushProvider: IPushProvider,
    private eligibilityPolicy: NotificationEligibilityPolicy,
    private retryQueue: NotificationRetryQueue
  ) {}

  /**
   * Main entry point for dispatching a notification.
   * Compatible with Transactional Outbox Pattern: Can be fed raw outbox messages directly.
   */
  async dispatch(
    correlationId: string, 
    eventId: string, 
    payload: NotificationPayload
  ): Promise<void> {
    const notificationId = ulid();

    // 1. Idempotency Check
    const exists = await this.auditStore.exists(correlationId, payload.recipientId);
    if (exists) {
      logger.info({ correlationId, recipientId: payload.recipientId }, 'Notification already processed (Idempotent block)');
      return;
    }

    // 2. Eligibility Check
    const isEligible = await this.eligibilityPolicy.isEligible(payload.recipientId, 'SYSTEM_EVENT');
    if (!isEligible) {
      logger.info({ correlationId, recipientId: payload.recipientId }, 'User not eligible for notification');
      return;
    }

    // 3. Persist Initial State (PENDING -> QUEUED)
    const record: NotificationRecord = {
      notificationId,
      correlationId,
      eventId,
      channel: payload.channel,
      state: 'QUEUED',
      createdAt: new Date(),
      updatedAt: new Date(),
      retryCount: 0
    };
    
    await this.auditStore.save(record);

    // 4. Dispatch (PROCESSING -> SENT or FAILED)
    await this.processDelivery(record, payload);
  }

  async processDelivery(record: NotificationRecord, payload: NotificationPayload): Promise<void> {
    await this.auditStore.updateState(record.notificationId, 'PROCESSING', record.retryCount);

    const startTime = Date.now();
    try {
      if (payload.channel === 'EMAIL') {
        await this.emailProvider.sendEmail(payload);
      } else if (payload.channel === 'SMS') {
        await this.smsProvider.sendSms(payload);
      } else if (payload.channel === 'PUSH') {
        await this.pushProvider.sendPush(payload);
      }

      const latency = Date.now() - startTime;
      logger.info({ notificationId: record.notificationId, latency }, 'Notification delivered successfully');
      
      await this.auditStore.updateState(record.notificationId, 'SENT', record.retryCount);
    } catch (error: any) {
      const latency = Date.now() - startTime;
      logger.error({ notificationId: record.notificationId, latency, err: error }, 'Notification delivery failed');
      
      await this.auditStore.updateState(record.notificationId, 'FAILED', record.retryCount);
      
      const providerError = error as ProviderError;
      if (providerError.isRetryable !== false) {
        // Enqueue for retry
        await this.retryQueue.enqueue(record, payload);
      } else {
        // DLQ immediately
        await this.auditStore.updateState(record.notificationId, 'DLQ', record.retryCount);
      }
    }
  }
}
