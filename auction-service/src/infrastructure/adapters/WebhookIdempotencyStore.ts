import { prisma } from '../../database';
import { logger } from '../../shared/logger';

export interface WebhookEventRecord {
  provider: string;
  providerEventId: string;
  providerPaymentId?: string;
  auctionId?: string;
  signatureVerified: boolean;
  processingResult: string;
  correlationId: string;
  requestId: string;
  rawPayloadHash?: string;
}

export class WebhookIdempotencyStore {
  async checkIfExists(provider: string, providerEventId: string): Promise<boolean> {
    const record = await prisma.webhookEvent.findUnique({
      where: { provider_providerEventId: { provider, providerEventId } }
    });
    return !!record;
  }

  /**
   * Attempts to record a webhook event.
   * If the event ID already exists for the provider, returns false (Duplicate detected).
   * Otherwise, returns true.
   */
  async recordEvent(event: WebhookEventRecord): Promise<boolean> {
    try {
      // Create record using Prisma. Assumes a unique constraint on (provider, providerEventId).
      // If it exists, Prisma throws a UniqueConstraintViolation (P2002).
      await prisma.webhookEvent.create({
        data: {
          provider: event.provider,
          providerEventId: event.providerEventId,
          providerPaymentId: event.providerPaymentId,
          auctionId: event.auctionId,
          receivedAt: new Date(),
          processedAt: new Date(),
          status: 'PROCESSED',
          signatureVerified: event.signatureVerified,
          processingResult: event.processingResult,
          correlationId: event.correlationId,
          requestId: event.requestId,
          retryCount: 0,
          rawPayloadHash: event.rawPayloadHash
        }
      });
      return true;
    } catch (error: any) {
      if (error.code === 'P2002') {
        logger.warn({ 
          provider: event.provider, 
          providerEventId: event.providerEventId 
        }, 'Duplicate webhook event detected. Replay protection triggered.');
        return false;
      }
      throw error;
    }
  }
}
