import { SettlementService } from './SettlementService';
import { logger } from '../../shared/logger';

export class SettlementProcessManager {
  constructor(private settlementService: SettlementService) {}

  /**
   * Subscribes to AuctionClosedWithWinner and triggers Settlement initiation.
   */
  async onAuctionClosedWithWinner(event: any): Promise<void> {
    try {
      logger.info({ event }, 'ProcessManager received AuctionClosedWithWinner');
      await this.settlementService.initiateSettlement(event.auctionId, event.winnerId);
    } catch (error) {
      logger.error({ err: error, auctionId: event.auctionId }, 'Failed to initiate settlement from ProcessManager');
      // In a real outbox/saga system, this might go to a DLQ or retry
    }
  }
}
