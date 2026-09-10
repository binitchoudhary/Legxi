import { Auction } from '../models/Auction';
import { Bid } from '../models/Bid';
import { BidAmount } from '../value-objects/BidAmount';
import { IncrementPolicy } from '../policies/IncrementPolicy';
import { BidValidationPolicy } from '../policies/BidValidationPolicy';
import { AuctionStatePolicy } from '../policies/AuctionStatePolicy';
import { ReservePricePolicy } from '../policies/ReservePricePolicy';
import { AuctionExtensionPolicy } from '../policies/AuctionExtensionPolicy';
import { AuctionClosingPolicy } from '../policies/AuctionClosingPolicy';
import { WinnerDeterminationPolicy } from '../policies/WinnerDeterminationPolicy';
import { AntiSnipingConfig } from '../config/AntiSnipingConfig';
import { AllowedAuctionStatus } from '../value-objects/AuctionStatus';
import { WinnerDecision } from '../value-objects/WinnerDecision';

export interface DomainEvent {
  type: string;
  payload: any;
}

export interface BidEvaluationResult {
  updatedAuction: Auction;
  eventsToPublish: DomainEvent[];
}

export interface AuctionClosureResult {
  updatedAuction: Auction;
  winnerDecision: WinnerDecision;
  eventsToPublish: DomainEvent[];
  isIdempotentNoOp: boolean;
}

/**
 * AuctionEngine
 * 
 * Central orchestration/facade for the Domain Layer.
 * Coordinates policies but does not implement business algorithms directly.
 */
export class AuctionEngine {
  constructor(
    private readonly incrementPolicy: IncrementPolicy,
    private readonly bidValidationPolicy: BidValidationPolicy,
    private readonly auctionStatePolicy: AuctionStatePolicy,
    private readonly reservePricePolicy: ReservePricePolicy,
    private readonly auctionExtensionPolicy: AuctionExtensionPolicy,
    private readonly auctionClosingPolicy: AuctionClosingPolicy,
    private readonly winnerDeterminationPolicy: WinnerDeterminationPolicy
  ) {}

  /**
   * Evaluates if a bid can be placed on an auction.
   * Coordinates validation policies.
   * Throws DomainErrors if rules are violated.
   */
  public evaluateBid(
    auction: Auction,
    bid: Bid,
    currentTime: Date,
    config: AntiSnipingConfig
  ): BidEvaluationResult {
    // 1. Calculate minimum required amount
    const minRequiredAmount = this.incrementPolicy.getMinimumNextBidAmount(auction);
    
    // 2. Validate bid against minimum increment and auction state
    this.bidValidationPolicy.validate(auction, bid.getAmount(), currentTime, minRequiredAmount);

    // 3. Evaluate Anti-Sniping (Extension)
    const extensionDecision = this.auctionExtensionPolicy.evaluate(auction, currentTime, config);

    // 4. Apply mutations to create new immutable state
    let updatedAuction = auction.withNewBid(bid);
    const eventsToPublish: DomainEvent[] = [];

    // Queue BidPlaced event
    eventsToPublish.push({
      type: 'BidPlaced',
      payload: {
        id: bid.getId(),
        auctionId: bid.getAuctionId(),
        userId: bid.getUserId(),
        amountPaise: bid.getAmount().toString(),
        isProxy: bid.getIsProxy(),
        createdAt: bid.getCreatedAt().toISOString(),
        version: updatedAuction.getVersion()
      }
    });

    if (extensionDecision.shouldExtend && extensionDecision.newEndTime) {
      updatedAuction = updatedAuction.withExtendedEndTime(extensionDecision.newEndTime);
      
      eventsToPublish.push({
        type: 'AuctionExtended',
        payload: {
          auctionId: updatedAuction.getId(),
          newEndTime: updatedAuction.getTimeWindow().getEndTime().toISOString(),
          extensionCount: updatedAuction.getExtensionCount(),
          version: updatedAuction.getVersion()
        }
      });
    }

    return {
      updatedAuction,
      eventsToPublish
    };
  }

  /**
   * Evaluates if a state transition is valid for an auction.
   */
  public evaluateStateTransition(auction: Auction, newStatus: AllowedAuctionStatus): void {
    this.auctionStatePolicy.validateTransition(auction, newStatus);
  }

  /**
   * Evaluates and applies time-based state transitions.
   * SCHEDULED -> PREPARING (5 mins before start)
   * PREPARING -> LIVE (at start)
   * LIVE/EXTENDED -> ENDING (at end)
   * ENDING -> ENDED (grace period after end)
   */
  public evaluateTimeBasedTransition(auction: Auction, currentTime: Date): { updatedAuction: Auction; eventsToPublish: DomainEvent[]; isIdempotentNoOp: boolean } {
    const status = auction.getStatus().getValue();
    const startTimeMs = auction.getTimeWindow().getStartTime().getTime();
    const endTimeMs = auction.getTimeWindow().getEndTime().getTime();
    const currentTimeMs = currentTime.getTime();
    
    const PREPARING_WINDOW_MS = 5 * 60 * 1000;
    const ENDING_GRACE_PERIOD_MS = 10 * 1000;

    let newStatus: AllowedAuctionStatus | null = null;

    if (status === 'SCHEDULED' && currentTimeMs >= startTimeMs - PREPARING_WINDOW_MS) {
      if (currentTimeMs >= startTimeMs) {
        newStatus = 'LIVE'; // Fast forward if missed preparing
      } else {
        newStatus = 'PREPARING';
      }
    } else if (status === 'PREPARING' && currentTimeMs >= startTimeMs) {
      if (currentTimeMs >= endTimeMs) {
        newStatus = 'ENDING'; // Fast forward
      } else {
        newStatus = 'LIVE';
      }
    } else if ((status === 'LIVE' || status === 'EXTENDED') && currentTimeMs >= endTimeMs) {
      newStatus = 'ENDING';
    } else if (status === 'ENDING' && currentTimeMs >= endTimeMs + ENDING_GRACE_PERIOD_MS) {
      newStatus = 'ENDED'; // Final state before close() determines winner
    }

    if (!newStatus) {
      return { updatedAuction: auction, eventsToPublish: [], isIdempotentNoOp: true };
    }

    const updatedAuction = auction.withStatus(newStatus);
    return {
      updatedAuction,
      eventsToPublish: [{
        type: 'AuctionStateTransitioned',
        payload: {
          auctionId: updatedAuction.getId(),
          oldStatus: status,
          newStatus: newStatus,
          timestamp: currentTime.toISOString(),
          version: updatedAuction.getVersion()
        }
      }],
      isIdempotentNoOp: false
    };
  }

  /**
   * Evaluates closing an auction.
   * Deterministically determines the winner among provided bids.
   * Returns a structured domain result.
   */
  public evaluateAuctionClosure(
    auction: Auction,
    bids: Bid[],
    currentTime: Date
  ): AuctionClosureResult {
    // 1. Validate if closing is allowed
    const canClose = this.auctionClosingPolicy.validate(auction, currentTime);
    
    // Idempotency: If already closed, return no-op result
    if (!canClose) {
      return {
        updatedAuction: auction,
        winnerDecision: WinnerDecision.withoutWinner(),
        eventsToPublish: [],
        isIdempotentNoOp: true
      };
    }

    // 2. Determine Winner
    const winnerDecision = this.winnerDeterminationPolicy.determineWinner(bids);

    // 3. Mutate State
    const updatedAuction = auction.close(winnerDecision);

    // 4. Generate Events
    const eventsToPublish: DomainEvent[] = [];
    
    eventsToPublish.push({
      type: 'AuctionClosed',
      payload: {
        auctionId: updatedAuction.getId(),
        status: updatedAuction.getStatus().getValue(),
        closedAt: currentTime.toISOString(),
        version: updatedAuction.getVersion()
      }
    });

    if (winnerDecision.hasWinner && winnerDecision.winningBid) {
      eventsToPublish.push({
        type: 'AuctionClosedWithWinner', // New Event for SettlementProcessManager
        payload: {
          auctionId: updatedAuction.getId(),
          winningBidId: winnerDecision.winningBid.getId(),
          winnerId: winnerDecision.winningBid.getUserId(),
          winningAmountPaise: winnerDecision.winningBid.getAmount().toString(),
          determinedAt: currentTime.toISOString(),
          version: updatedAuction.getVersion()
        }
      });
    }

    return {
      updatedAuction,
      winnerDecision,
      eventsToPublish,
      isIdempotentNoOp: false
    };
  }
}
