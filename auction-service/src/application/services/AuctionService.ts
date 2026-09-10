import { IAuctionService } from '../../api/services/IAuctionService';
import { IAuctionRepository } from '../ports/IAuctionRepository';
import { IBidRepository } from '../ports/IBidRepository';
import { IAuctionTransactionBoundary } from '../ports/IAuctionTransactionBoundary';
import { IEventPublisher } from '../ports/IEventPublisher';
import { ITimeProvider } from '../ports/ITimeProvider';
import { AuctionDTO } from '../../api/dto/auction.dto';
import { AuctionNotFoundError } from '../exceptions/ApplicationErrors';
import { AuctionEngine } from '../../domain';

export class AuctionService implements IAuctionService {
  constructor(
    private auctionRepository: IAuctionRepository,
    private bidRepository: IBidRepository,
    private transactionBoundary: IAuctionTransactionBoundary,
    private eventPublisher: IEventPublisher,
    private timeProvider: ITimeProvider,
    private auctionEngine: AuctionEngine
  ) {}

  async listAuctions(limit: number, cursor?: string, status?: string, shopifyProductId?: string): Promise<{ auctions: AuctionDTO[]; nextCursor?: string }> {
    return this.auctionRepository.list(limit, cursor, status, shopifyProductId);
  }

  async getAuction(id: string): Promise<AuctionDTO | null> {
    const auction = await this.auctionRepository.findById(id);
    if (!auction) {
      throw new AuctionNotFoundError(id);
    }
    return auction;
  }

  async closeAuction(id: string): Promise<void> {
    const eventsToPublish = await this.transactionBoundary.executeWithLock(id, async (auction, txContext) => {
      const bids = await txContext.fetchBids(id);
      const currentTime = this.timeProvider.getCurrentTime();

      // 3. Delegate to Domain Layer
      const result = this.auctionEngine.evaluateAuctionClosure(auction, bids, currentTime);

      if (result.isIdempotentNoOp) {
        // Already closed or processed, return empty events to avoid duplicate publishing
        return [];
      }

      // 4. Delegate Atomic Persistence
      await txContext.updateAuction(result.updatedAuction);

      for (const event of result.eventsToPublish) {
        await txContext.insertOutboxEvent(event);
      }

      return result.eventsToPublish;
    });

    // 5. Publish Domain Events
    for (const event of eventsToPublish) {
      await this.eventPublisher.publish(event.type, event.payload);
    }
  }

  async advanceState(id: string): Promise<void> {
    const eventsToPublish = await this.transactionBoundary.executeWithLock(id, async (auction, txContext) => {
      const currentTime = this.timeProvider.getCurrentTime();

      // Delegate to Domain Layer
      const result = this.auctionEngine.evaluateTimeBasedTransition(auction, currentTime);

      if (result.isIdempotentNoOp) {
        return [];
      }

      // Delegate Atomic Persistence
      await txContext.updateAuction(result.updatedAuction);

      // Audit Log
      await txContext.logAudit({
        action: 'STATE_TRANSITION',
        actorId: 'SYSTEM',
        details: {
          from: auction.getStatus().getValue(),
          to: result.updatedAuction.getStatus().getValue(),
          reason: 'TIME_BASED'
        }
      });

      return result.eventsToPublish;
    });

    for (const event of eventsToPublish) {
      await this.eventPublisher.publish(event.type, event.payload);
    }
  }

  /**
   * Layer 7: Transitions an auction from ENDED → SETTLED.
   * Called after payment webhook confirms successful capture.
   * Uses executeWithLock to serialize with any concurrent operations.
   * Domain validation via AuctionStatePolicy ensures only ENDED → SETTLED is allowed.
   */
  async settleAuction(id: string): Promise<void> {
    const eventsToPublish = await this.transactionBoundary.executeWithLock(id, async (auction, txContext) => {
      const currentStatus = auction.getStatus().getValue();

      // Idempotency: if already SETTLED or ARCHIVED, no-op
      if (currentStatus === 'SETTLED' || currentStatus === 'ARCHIVED') {
        return [];
      }

      // Domain validation: AuctionStatePolicy enforces ENDED → SETTLED
      this.auctionEngine.evaluateStateTransition(auction, 'SETTLED');

      const updatedAuction = auction.withStatus('SETTLED');

      await txContext.updateAuction(updatedAuction);

      await txContext.logAudit({
        action: 'AUCTION_SETTLED',
        actorId: 'SYSTEM',
        details: {
          from: currentStatus,
          to: 'SETTLED',
          reason: 'PAYMENT_CONFIRMED'
        }
      });

      return [
        {
          type: 'auction.settled',
          payload: {
            auctionId: updatedAuction.getId(),
            status: 'SETTLED',
            version: updatedAuction.getVersion(),
            timestamp: new Date().toISOString()
          }
        }
      ];
    });

    for (const event of eventsToPublish) {
      await this.eventPublisher.publish(event.type, event.payload);
    }
  }

  /**
   * Layer 7 Phase 3: Atomic Settlement Webhook processing.
   * Executes Auction mutation, Settlement mutation, and Idempotency marker within a single lock.
   */
  async processSettlementWebhook(auctionId: string, orderId: string, payload: any): Promise<{ alreadyProcessed: boolean }> {
    const eventsToPublish = await this.transactionBoundary.executeWithLock(auctionId, async (auction, txContext) => {
      // 1. Idempotency Check (via Auction state)
      const currentStatus = auction.getStatus().getValue();
      if (currentStatus === 'SETTLED' || currentStatus === 'ARCHIVED') {
        return { alreadyProcessed: true, events: [] };
      }

      // 2. Fetch and Check Settlement State
      const settlement = await txContext.getSettlement(auctionId);
      if (!settlement) {
        throw new Error(`Settlement not found for auction ${auctionId}`);
      }

      if (settlement.settlementStatus === 'COMPLETED') {
        return { alreadyProcessed: true, events: [] };
      }

      // 3. Mutate Settlement
      settlement.capturePayment();
      await txContext.updateSettlement(settlement);

      // 4. Mutate Auction
      this.auctionEngine.evaluateStateTransition(auction, 'SETTLED');
      const updatedAuction = auction.withStatus('SETTLED');
      await txContext.updateAuction(updatedAuction);

      // 5. Audit Log
      await txContext.logAudit({
        action: 'AUCTION_SETTLED_VIA_WEBHOOK',
        actorId: 'SYSTEM',
        details: {
          from: currentStatus,
          to: 'SETTLED',
          reason: 'SHOPIFY_WEBHOOK_RECEIVED',
          orderId
        }
      });

      // 6. Idempotency Marker
      await txContext.recordWebhookEvent({
        provider: 'shopify',
        providerEventId: orderId,
        providerPaymentId: String(payload.id),
        auctionId: auctionId,
        signatureVerified: true,
        processingResult: 'SUCCESS',
        correlationId: payload.id.toString(),
        requestId: payload.id.toString(),
      });

      // 7. Generate Outbox Events
      const events = [
        {
          type: 'auction.settled',
          payload: {
            auctionId: updatedAuction.getId(),
            status: 'SETTLED',
            version: updatedAuction.getVersion(),
            timestamp: new Date().toISOString()
          }
        },
        {
          type: 'SettlementCompleted',
          payload: {
            settlementId: settlement.settlementId,
            auctionId: settlement.auctionId,
            winnerId: settlement.winnerId
          }
        }
      ];

      return { alreadyProcessed: false, events };
    });

    for (const event of eventsToPublish.events) {
      await this.eventPublisher.publish(event.type, event.payload);
    }

    return { alreadyProcessed: eventsToPublish.alreadyProcessed };
  }

  /**
   * Layer 7: Transitions an auction from SETTLED → ARCHIVED.
   * Called by the StateTransitionScheduler after the 7-day archive delay.
   * Uses executeWithLock to serialize with any concurrent operations.
   */
  async archiveAuction(id: string): Promise<void> {
    const eventsToPublish = await this.transactionBoundary.executeWithLock(id, async (auction, txContext) => {
      const currentStatus = auction.getStatus().getValue();

      // Idempotency: if already ARCHIVED, no-op
      if (currentStatus === 'ARCHIVED') {
        return [];
      }

      // Domain validation: AuctionStatePolicy enforces SETTLED → ARCHIVED
      this.auctionEngine.evaluateStateTransition(auction, 'ARCHIVED');

      const updatedAuction = auction.withStatus('ARCHIVED');

      await txContext.updateAuction(updatedAuction);

      await txContext.logAudit({
        action: 'AUCTION_ARCHIVED',
        actorId: 'SYSTEM',
        details: {
          from: currentStatus,
          to: 'ARCHIVED',
          reason: 'ARCHIVE_DELAY_ELAPSED'
        }
      });

      return [
        {
          type: 'auction.archived',
          payload: {
            auctionId: updatedAuction.getId(),
            status: 'ARCHIVED',
            version: updatedAuction.getVersion(),
            timestamp: new Date().toISOString()
          }
        }
      ];
    });

    for (const event of eventsToPublish) {
      await this.eventPublisher.publish(event.type, event.payload);
    }
  }
}

