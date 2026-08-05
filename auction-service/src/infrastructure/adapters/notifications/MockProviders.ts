import { IEmailProvider } from '../../../notifications/ports/IEmailProvider';
import { ISmsProvider } from '../../../notifications/ports/ISmsProvider';
import { IPushProvider } from '../../../notifications/ports/IPushProvider';
import { NotificationPayload } from '../../../notifications/types';
import { logger } from '../../../shared/logger';

export class MockEmailProvider implements IEmailProvider {
  async sendEmail(payload: NotificationPayload): Promise<void> {
    logger.info({ payload }, 'MockEmailProvider: Simulated Email Dispatch');
  }
}

export class MockSmsProvider implements ISmsProvider {
  async sendSms(payload: NotificationPayload): Promise<void> {
    logger.info({ payload }, 'MockSmsProvider: Simulated SMS Dispatch');
  }
}

export class MockPushProvider implements IPushProvider {
  async sendPush(payload: NotificationPayload): Promise<void> {
    logger.info({ payload }, 'MockPushProvider: Simulated Push Dispatch');
  }
}
