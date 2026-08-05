import { Bid } from '../models/Bid';
import { WinnerDecision } from '../value-objects/WinnerDecision';

export class WinnerDeterminationPolicy {
  /**
   * Deterministically selects the winning bid from a collection of bids.
   * Rules:
   * - Ignores invalid/proxy-shadow bids (status !== 'ACCEPTED').
   * - Highest valid bid wins.
   * - Tie-breaking: Earlier bid wins based on createdAt timestamp.
   */
  public determineWinner(bids: Bid[]): WinnerDecision {
    const validBids = bids.filter(bid => bid.getStatus() === 'ACCEPTED');

    if (validBids.length === 0) {
      return WinnerDecision.withoutWinner();
    }

    const winningBid = validBids.reduce((currentWinner, candidate) => {
      const currentAmount = currentWinner.getAmount().getValue();
      const candidateAmount = candidate.getAmount().getValue();

      if (candidateAmount > currentAmount) {
        return candidate;
      }
      
      if (candidateAmount === currentAmount) {
        // Tie-breaker: earliest createdAt wins
        if (candidate.getCreatedAt() < currentWinner.getCreatedAt()) {
          return candidate;
        }
      }
      
      return currentWinner;
    });

    return WinnerDecision.withWinner(winningBid);
  }
}
