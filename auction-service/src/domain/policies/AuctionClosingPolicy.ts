import { Auction } from '../models/Auction';
import { DomainError } from '../exceptions/DomainErrors';

export class AuctionClosingPolicy {
  /**
   * Validates if the auction can be closed.
   * Returns true if it can be closed.
   * Returns false if it is already closed (idempotency).
   * Throws DomainError if it is too early to close.
   */
  public validate(auction: Auction, currentTime: Date): boolean {
    const status = auction.getStatus().getValue();

    // Idempotency: if already ended, settled, or archived, we consider it a no-op success
    if (status === 'ENDED' || status === 'SETTLED' || status === 'ARCHIVED') {
      return false; 
    }

    // Cannot close an auction that hasn't reached its end time
    if (currentTime < auction.getTimeWindow().getEndTime()) {
      throw new DomainError('Cannot close auction before its end time.', 'AUCTION_NOT_ENDED');
    }

    return true;
  }
}
