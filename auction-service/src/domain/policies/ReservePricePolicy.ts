import { Auction } from '../models/Auction';
import { BidAmount } from '../value-objects/BidAmount';
import { ReservePriceNotMetError } from '../exceptions/DomainErrors';

/**
 * Domain policy for reserve price checking.
 */
export class ReservePricePolicy {
  /**
   * Validates if a bid meets the reserve price (if configured).
   * Note: This might not block the bid (depending on business rules, 
   * the bid could be 'ACCEPTED_BELOW_RESERVE'), but for now we provide
   * the validation mechanism.
   */
  public evaluateReserve(auction: Auction, bidAmount: BidAmount): void {
    const reserve = auction.getReservePrice();
    if (reserve === null) {
      return; // No reserve price configured
    }

    if (!bidAmount.isGreaterThanOrEqual(reserve)) {
      // Extension point: In future phases, you might not throw an error,
      // but return a specific BidStatus like 'BELOW_RESERVE'.
      // For now, if the policy is invoked and fails, it throws.
      throw new ReservePriceNotMetError(`Bid amount ${bidAmount.toString()} is below reserve price ${reserve.toString()}`);
    }
  }
}
