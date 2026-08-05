import { Bid } from '../models/Bid';

/**
 * Encapsulates the domain decision of determining a winner.
 */
export class WinnerDecision {
  constructor(
    public readonly hasWinner: boolean,
    public readonly winningBid?: Bid
  ) {}

  public static withWinner(bid: Bid): WinnerDecision {
    return new WinnerDecision(true, bid);
  }

  public static withoutWinner(): WinnerDecision {
    return new WinnerDecision(false);
  }
}
