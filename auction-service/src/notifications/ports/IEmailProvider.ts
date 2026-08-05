import { NotificationPayload } from '../types';

export interface IEmailProvider {
  sendEmail(payload: NotificationPayload): Promise<void>;
}
