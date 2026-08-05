import { NotificationPayload } from '../types';

export interface IPushProvider {
  sendPush(payload: NotificationPayload): Promise<void>;
}
