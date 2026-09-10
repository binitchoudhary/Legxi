import { Auction } from '../models/Auction';
import { AllowedAuctionStatus } from '../value-objects/AuctionStatus';
import { InvalidAuctionStatusError } from '../exceptions/DomainErrors';

/**
 * Domain policy for state transition rules.
 * Aligned with ADR-002 lifecycle:
 * DRAFT → SCHEDULED → PREPARING → LIVE → EXTENDED/ENDING → ENDED → SETTLED → ARCHIVED
 */
export class AuctionStatePolicy {
  /**
   * Validates if a transition from current status to new status is allowed.
   */
  public validateTransition(auction: Auction, newStatus: AllowedAuctionStatus): void {
    const current = auction.getStatus().getValue();

    if (current === newStatus) {
      return; // No-op
    }

    // ADR-002 state machine rules
    switch (current) {
      case 'DRAFT':
        if (newStatus !== 'SCHEDULED') {
          throw new InvalidAuctionStatusError(`Cannot transition from DRAFT to ${newStatus}`);
        }
        break;
      case 'SCHEDULED':
        if (newStatus !== 'PREPARING') {
          throw new InvalidAuctionStatusError(`Cannot transition from SCHEDULED to ${newStatus}`);
        }
        break;
      case 'PREPARING':
        if (newStatus !== 'LIVE') {
          throw new InvalidAuctionStatusError(`Cannot transition from PREPARING to ${newStatus}`);
        }
        break;
      case 'LIVE':
        if (newStatus !== 'EXTENDED' && newStatus !== 'ENDING' && newStatus !== 'ENDED') {
          throw new InvalidAuctionStatusError(`Cannot transition from LIVE to ${newStatus}`);
        }
        break;
      case 'EXTENDED':
        if (newStatus !== 'ENDING' && newStatus !== 'ENDED' && newStatus !== 'EXTENDED') {
          throw new InvalidAuctionStatusError(`Cannot transition from EXTENDED to ${newStatus}`);
        }
        break;
      case 'ENDING':
        if (newStatus !== 'ENDED') {
          throw new InvalidAuctionStatusError(`Cannot transition from ENDING to ${newStatus}`);
        }
        break;
      case 'ENDED':
        if (newStatus !== 'SETTLED') {
          throw new InvalidAuctionStatusError(`Cannot transition from ENDED to ${newStatus}`);
        }
        break;
      case 'SETTLED':
        if (newStatus !== 'ARCHIVED') {
          throw new InvalidAuctionStatusError(`Cannot transition from SETTLED to ${newStatus}`);
        }
        break;
      case 'ARCHIVED':
        throw new InvalidAuctionStatusError(`Cannot transition out of terminal state ARCHIVED`);
      default:
        throw new InvalidAuctionStatusError(`Unknown current state ${current}`);
    }
  }
}

