import { Auction } from '../models/Auction';
import { BidAmount } from '../value-objects/BidAmount';
import { AuctionNotActiveError, InvalidBidAmountError } from '../exceptions/DomainErrors';

/**
 * Domain policy for minimum bid / active checks.
 */
export class BidValidationPolicy {
  // No dependencies to other policies


  /**
   * Evaluates whether the proposed bid amount is valid for the given auction.
   * Throws domain exceptions if validation fails.
   */
  public validate(auction: Auction, proposedAmount: BidAmount, currentTime: Date, minRequiredAmount: BidAmount): void {
    // 1. Check if auction is accepting bids
    if (!auction.isAcceptingBids(currentTime)) {
      throw new AuctionNotActiveError(`Auction ${auction.getId()} is not active at ${currentTime.toISOString()}`);
    }

    // 2. Check increment rules
    if (!proposedAmount.isGreaterThanOrEqual(minRequiredAmount)) {
      throw new InvalidBidAmountError(
        `Bid amount ${proposedAmount.toString()} is below the required minimum of ${minRequiredAmount.toString()}`
      );
    }

    // Extension point: Bidder eligibility hooks (e.g. KYC, blocked users) could be added here
  }
}
