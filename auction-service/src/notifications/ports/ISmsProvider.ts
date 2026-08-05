import { NotificationPayload } from '../types';

export interface ISmsProvider {
  sendSms(payload: NotificationPayload): Promise<void>;
}
