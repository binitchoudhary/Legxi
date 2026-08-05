import { Auction } from '../models/Auction';
import { BidAmount } from '../value-objects/BidAmount';

/**
 * Domain policy for minimum increment calculation.
 */
export class IncrementPolicy {
  /**
   * Calculates the minimum acceptable bid amount for a given auction.
   * Does NOT handle anti-sniping or winner calculations.
   */
  public getMinimumNextBidAmount(auction: Auction): BidAmount {
    // If it's the first bid (currentPrice == startingPrice and no winning bid)
    // the minimum valid bid might just be the starting price. 
    // Usually, the platform requires at least (current + increment) after the first bid.
    // For Legxi, we ensure (newBid >= currentPrice + minIncrement) 
    // unless there are zero bids, in which case newBid >= startingPrice is sometimes accepted.
    // Assuming strictly: must always beat current price by at least minIncrement if a bid exists,
    // otherwise must at least equal starting price.
    
    if (auction.getWinningBidId() === null) {
      return auction.getStartingPrice();
    }

    return auction.getCurrentPrice().add(auction.getMinIncrement());
  }
}
