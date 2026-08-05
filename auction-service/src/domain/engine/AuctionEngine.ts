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
        status: bid.getStatus(),
        createdAt: bid.getCreatedAt().toISOString()
      }
    });

    if (extensionDecision.shouldExtend && extensionDecision.newEndTime) {
      updatedAuction = updatedAuction.withExtendedEndTime(extensionDecision.newEndTime);
      
      eventsToPublish.push({
        type: 'AuctionExtended',
        payload: {
          auctionId: updatedAuction.getId(),
          newEndTime: updatedAuction.getTimeWindow().getEndTime().toISOString(),
          extensionCount: updatedAuction.getExtensionCount()
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
        closedAt: currentTime.toISOString()
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
          determinedAt: currentTime.toISOString()
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
