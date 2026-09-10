import { InvalidAuctionStatusError } from '../exceptions/DomainErrors';

export type AllowedAuctionStatus = 'DRAFT' | 'SCHEDULED' | 'PREPARING' | 'LIVE' | 'EXTENDED' | 'ENDING' | 'ENDED' | 'SETTLED' | 'ARCHIVED';

const VALID_STATUSES = new Set<AllowedAuctionStatus>([
  'DRAFT', 'SCHEDULED', 'PREPARING', 'LIVE', 'EXTENDED', 'ENDING', 'ENDED', 'SETTLED', 'ARCHIVED'
]);

/**
 * Immutable Value Object representing the state of an Auction.
 */
export class AuctionStatus {
  private readonly status: AllowedAuctionStatus;

  constructor(status: string) {
    if (!VALID_STATUSES.has(status as AllowedAuctionStatus)) {
      throw new InvalidAuctionStatusError(`Invalid auction status: ${status}`);
    }
    this.status = status as AllowedAuctionStatus;
  }

  public getValue(): AllowedAuctionStatus {
    return this.status;
  }

  public equals(other: AuctionStatus | AllowedAuctionStatus): boolean {
    if (other instanceof AuctionStatus) {
      return this.status === other.getValue();
    }
    return this.status === other;
  }

  public isActive(): boolean {
    return this.status === 'LIVE' || this.status === 'EXTENDED' || this.status === 'ENDING';
  }
  
  public isClosed(): boolean {
    return this.status === 'ENDED' || this.status === 'SETTLED' || this.status === 'ARCHIVED';
  }
}
