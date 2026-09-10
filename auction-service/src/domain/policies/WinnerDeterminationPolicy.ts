import { Bid } from '../models/Bid';
import { WinnerDecision } from '../value-objects/WinnerDecision';

export class WinnerDeterminationPolicy {
  /**
   * Deterministically selects the winning bid from a collection of bids.
   * Rules:
   * - Highest valid bid wins (all bids in the ledger are accepted).
   * - Tie-breaking: Earlier bid wins based on createdAt timestamp.
   */
  public determineWinner(bids: Bid[]): WinnerDecision {
    if (bids.length === 0) {
      return WinnerDecision.withoutWinner();
    }

    const winningBid = bids.reduce((currentWinner, candidate) => {
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
