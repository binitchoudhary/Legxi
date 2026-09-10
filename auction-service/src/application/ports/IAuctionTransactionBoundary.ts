import { Auction } from '../../domain/models/Auction';
import { Bid } from '../../domain/models/Bid';
import { BidIntent } from '../../domain/models/BidIntent';

export interface AuditLog {
  action: string;
  actorId: string;
  details: any;
}

export interface ITransactionContext {
  checkIdempotency(intentId: string): Promise<BidIntent | null>;
  persistBid(auction: Auction, bid: Bid, intent: BidIntent): Promise<void>;
  fetchBids(auctionId: string): Promise<Bid[]>;
  updateAuction(auction: Auction): Promise<void>;
  logAudit(audit: AuditLog): Promise<void>;
  insertOutboxEvent(event: any): Promise<void>;
  
  // Phase 3 extensions for atomic settlement webhook
  getSettlement(auctionId: string): Promise<any>;
  updateSettlement(settlement: any): Promise<void>;
  recordWebhookEvent(event: any): Promise<void>;
}

export interface IAuctionTransactionBoundary {
  /**
   * Acquires a pessimistic row-level lock (FOR UPDATE), executes the domain logic callback, 
   * and persists the resulting aggregate mutations atomically.
   */
  executeWithLock<T>(
    auctionId: string,
    operation: (lockedAuction: Auction, txContext: ITransactionContext) => Promise<T>
  ): Promise<T>;
}
