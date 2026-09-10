import { ISettlementRepository } from '../ports/ISettlementRepository';
import { IEventPublisher } from '../ports/IEventPublisher';
import { Settlement } from '../../domain/models/Settlement';
import { PaymentProviderReference } from '../../domain/value-objects/PaymentProviderReference';
import { ulid } from 'ulidx';
import { logger } from '../../shared/logger';

export class SettlementService {
  constructor(
    private repository: ISettlementRepository,
    private eventPublisher: IEventPublisher
  ) {}

  async getSettlement(settlementId: string): Promise<Settlement | null> {
    return this.repository.findById(settlementId);
  }

  async initiateSettlement(auctionId: string, winnerId: string): Promise<Settlement> {
    const existing = await this.repository.findByAuctionId(auctionId);
    if (existing) {
      logger.warn({ auctionId }, 'Settlement already initiated for auction');
      return existing;
    }

    const settlement = new Settlement(
      ulid(),
      auctionId,
      winnerId,
      'PENDING',
      'INITIATED',
      new Date(),
      0,
      null,
      1
    );

    const event = {
      type: 'SettlementCreated',
      payload: {
        settlementId: settlement.settlementId,
        auctionId: settlement.auctionId,
        winnerId: settlement.winnerId
      }
    };

    try {
      await this.repository.saveWithOutboxEvent(settlement, event);
    } catch (error: any) {
      // Handle concurrent creation race: if another worker created the settlement
      // between our findByAuctionId check and save, Prisma throws P2002 (unique constraint).
      // Treat as idempotent success — re-read and return the existing record.
      if (error.code === 'P2002') {
        logger.warn({ auctionId }, 'Settlement unique constraint race — treating as idempotent success');
        const raceWinner = await this.repository.findByAuctionId(auctionId);
        if (raceWinner) return raceWinner;
      }
      throw error;
    }

    return settlement;
  }

  async recordPaymentAttempt(settlementId: string, provider: string, paymentId: string, eventId?: string): Promise<void> {
    const settlement = await this.repository.findById(settlementId);
    if (!settlement) throw new Error('Settlement not found');

    const providerRef = new PaymentProviderReference(provider, paymentId, eventId);
    settlement.recordPaymentAttempt(providerRef);

    await this.repository.updateOptimistically(settlement, settlement.version);
    
    await this.eventPublisher.publish('PaymentWindowOpened', {
      settlementId: settlement.settlementId,
      auctionId: settlement.auctionId
    });
  }

  async markPaymentCaptured(settlementId: string): Promise<void> {
    const settlement = await this.repository.findById(settlementId);
    if (!settlement) throw new Error('Settlement not found');

    settlement.capturePayment();
    await this.repository.updateOptimistically(settlement, settlement.version);

    await this.eventPublisher.publish('SettlementCompleted', {
      settlementId: settlement.settlementId,
      auctionId: settlement.auctionId
    });
  }
  
  async markPaymentFailed(settlementId: string): Promise<void> {
    const settlement = await this.repository.findById(settlementId);
    if (!settlement) throw new Error('Settlement not found');

    settlement.failPayment();
    await this.repository.updateOptimistically(settlement, settlement.version);
  }
  
  async defaultSettlement(settlementId: string): Promise<void> {
    const settlement = await this.repository.findById(settlementId);
    if (!settlement) throw new Error('Settlement not found');

    settlement.defaultSettlement();
    await this.repository.updateOptimistically(settlement, settlement.version);

    await this.eventPublisher.publish('SettlementDefaulted', {
      settlementId: settlement.settlementId,
      auctionId: settlement.auctionId
    });
  }

  async processPaymentWebhook(auctionId: string, payload: any, gatewayResult: { success: boolean, failureReason?: string }): Promise<void> {
    const settlement = await this.repository.findByAuctionId(auctionId);
    if (!settlement) {
      logger.warn({ auctionId }, 'Webhook received for auction without settlement');
      return; // Ignore webhooks for unknown settlements
    }

    if (gatewayResult.success) {
      settlement.capturePayment();
      await this.repository.updateOptimistically(settlement, settlement.version);
      await this.eventPublisher.publish('SettlementCompleted', {
        settlementId: settlement.settlementId,
        auctionId: settlement.auctionId,
        winnerId: settlement.winnerId
      });
    } else {
      settlement.failPayment();
      await this.repository.updateOptimistically(settlement, settlement.version);
      // Depending on business rules, we might not publish SettlementDefaulted yet if retries are allowed.
    }
  }
}
