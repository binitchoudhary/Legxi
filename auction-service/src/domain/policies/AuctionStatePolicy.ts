import { Auction } from '../models/Auction';
import { AllowedAuctionStatus } from '../value-objects/AuctionStatus';
import { InvalidAuctionStatusError } from '../exceptions/DomainErrors';

/**
 * Domain policy for state transition rules.
 * Does not involve persistence.
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

    // Basic state machine rules
    switch (current) {
      case 'DRAFT':
        if (newStatus !== 'PUBLISHED' && newStatus !== 'CANCELLED') {
          throw new InvalidAuctionStatusError(`Cannot transition from DRAFT to ${newStatus}`);
        }
        break;
      case 'PUBLISHED':
        if (newStatus !== 'ACTIVE' && newStatus !== 'CANCELLED') {
          throw new InvalidAuctionStatusError(`Cannot transition from PUBLISHED to ${newStatus}`);
        }
        break;
      case 'ACTIVE':
        if (newStatus !== 'PAUSED' && newStatus !== 'CLOSED' && newStatus !== 'CANCELLED') {
          throw new InvalidAuctionStatusError(`Cannot transition from ACTIVE to ${newStatus}`);
        }
        break;
      case 'PAUSED':
        if (newStatus !== 'ACTIVE' && newStatus !== 'CLOSED' && newStatus !== 'CANCELLED') {
          throw new InvalidAuctionStatusError(`Cannot transition from PAUSED to ${newStatus}`);
        }
        break;
      case 'CLOSED':
        if (newStatus !== 'SETTLED') {
          throw new InvalidAuctionStatusError(`Cannot transition from CLOSED to ${newStatus}`);
        }
        break;
      case 'SETTLED':
      case 'CANCELLED':
        throw new InvalidAuctionStatusError(`Cannot transition out of terminal state ${current}`);
      default:
        throw new InvalidAuctionStatusError(`Unknown current state ${current}`);
    }
  }
}
