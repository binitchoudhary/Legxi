import { BidAmount } from '../value-objects/BidAmount';

export type BidStatus = 'ACCEPTED' | 'REJECTED' | 'OUTBID';

/**
 * Immutable Domain Entity representing a single Bid.
 */
export class Bid {
  constructor(
    private readonly id: string,
    private readonly auctionId: string,
    private readonly userId: string,
    private readonly amount: BidAmount,
    private readonly isProxy: boolean,
    private readonly status: BidStatus,
    private readonly createdAt: Date
  ) {}

  public getId(): string {
    return this.id;
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

  public getIsProxy(): boolean {
    return this.isProxy;
  }

  public getStatus(): BidStatus {
    return this.status;
  }

  public getCreatedAt(): Date {
    return new Date(this.createdAt.getTime()); // Clone to maintain immutability
  }

  /**
   * Returns a new Bid instance with an updated status (immutability pattern).
   */
  public withStatus(newStatus: BidStatus): Bid {
    return new Bid(
      this.id,
      this.auctionId,
      this.userId,
      this.amount,
      this.isProxy,
      newStatus,
      this.createdAt
    );
  }
}
