export type NotificationState = 'PENDING' | 'QUEUED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'DLQ';

export type ChannelType = 'EMAIL' | 'SMS' | 'PUSH';

export interface NotificationId {
  value: string;
}

export interface CorrelationId {
  value: string;
}

export interface EventId {
  value: string;
}

export interface ProviderError extends Error {
  isRetryable: boolean;
}

export interface NotificationPayload {
  recipientId: string;
  recipientContact: string;
  subject?: string;
  body: string;
  channel: ChannelType;
}

export interface NotificationRecord {
  notificationId: string;
  correlationId: string;
  eventId: string;
  channel: ChannelType;
  state: NotificationState;
  createdAt: Date;
  updatedAt: Date;
  retryCount: number;
}
