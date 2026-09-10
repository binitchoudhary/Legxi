import { IPaymentGateway } from '../ports/IPaymentGateway';
import { SettlementService } from './SettlementService';
import { IAuctionService } from '../../api/services/IAuctionService';
import { logger } from '../../shared/logger';

export class ShopifyDraftOrderOrchestrator {
  constructor(
    private readonly paymentGateway: IPaymentGateway,
    private readonly settlementService: SettlementService,
    private readonly auctionService: IAuctionService
  ) {}

  /**
   * Consumes SettlementCreated Domain Event from the Outbox.
   * Invokes Shopify Payment Gateway (external HTTP) outside of the Postgres transaction.
   * On success, updates the Settlement record with the provider reference.
   */
  async onSettlementCreated(event: any): Promise<void> {
    const { auctionId, settlementId, winnerId } = event;

    try {
      logger.info({ auctionId, settlementId }, 'Orchestrating Shopify Draft Order creation');
      
      const auctionDto = await this.auctionService.getAuction(auctionId);
      if (!auctionDto) {
        throw new Error(`Auction not found: ${auctionId}`);
      }

      // Invoke external HTTP call
      const result = await this.paymentGateway.createPaymentSession(auctionId, auctionDto.currentPricePaise.toString(), winnerId);

      if (!result.success || !result.providerReference) {
        throw new Error(`Shopify Draft Order creation failed: ${result.failureReason}`);
      }

      // Record the successful attempt back to the DB
      await this.settlementService.recordPaymentAttempt(
        settlementId,
        'shopify',
        result.providerReference,
        undefined
      );

      logger.info({ auctionId, settlementId, providerPaymentId: result.providerReference }, 'Shopify Draft Order created successfully');
    } catch (error: any) {
      logger.error({ err: error, auctionId, settlementId }, 'Draft Order orchestration failed');
      // Re-throw so OutboxRelayWorker catches it, logs the error, and keeps the event PENDING for retry.
      throw error;
    }
  }
}
