import { BidAmount } from '../value-objects/BidAmount';

/**
 * Immutable Domain Entity representing an idempotent Bid Intent.
 */
export class BidIntent {
  constructor(
    private readonly intentId: string,
    private readonly auctionId: string,
    private readonly userId: string,
    private readonly amount: BidAmount,
    private readonly bidId: string | null,
    private readonly createdAt: Date
  ) {}

  public getIntentId(): string {
    return this.intentId;
  }

  public getAuctionId(): string {
    return this.auctionId;
  }

  public getUserId(): string {
    return this.userId;
  }

  public getAmount(): BidAmount {
    return this.amount;
  }

  public getBidId(): string | null {
    return this.bidId;
  }

  public getCreatedAt(): Date {
    return new Date(this.createdAt.getTime());
  }
}
