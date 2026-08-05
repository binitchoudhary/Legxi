import { NotificationRecord, NotificationState } from '../types';

export interface INotificationAuditStore {
  /**
   * Checks if a notification for the given CorrelationId and Recipient already exists.
   */
  exists(correlationId: string, recipientId: string): Promise<boolean>;
  
  /**
   * Saves a new notification record to the audit store.
   */
  save(record: NotificationRecord): Promise<void>;

  /**
   * Updates the state of an existing notification.
   */
  updateState(notificationId: string, state: NotificationState, retryCount: number): Promise<void>;
}
