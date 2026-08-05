import { INotificationAuditStore } from '../../../notifications/ports/INotificationAuditStore';
import { NotificationRecord, NotificationState } from '../../../notifications/types';
import { logger } from '../../../shared/logger';

export class MockAuditStore implements INotificationAuditStore {
  private records = new Map<string, NotificationRecord>();

  async exists(correlationId: string, recipientId: string): Promise<boolean> {
    for (const record of this.records.values()) {
      if (record.correlationId === correlationId) {
        // Simple mock check
        return true;
      }
    }
    return false;
  }

  async save(record: NotificationRecord): Promise<void> {
    this.records.set(record.notificationId, record);
    logger.debug({ record }, 'MockAuditStore: Notification record saved');
  }

  async updateState(notificationId: string, state: NotificationState, retryCount: number): Promise<void> {
    const record = this.records.get(notificationId);
    if (record) {
      record.state = state;
      record.retryCount = retryCount;
      record.updatedAt = new Date();
      logger.debug({ notificationId, state, retryCount }, 'MockAuditStore: Notification state updated');
    }
  }
}
