import { BidAmount } from '../value-objects/BidAmount';
import { AuctionStatus, AllowedAuctionStatus } from '../value-objects/AuctionStatus';
import { AuctionTimeWindow } from '../value-objects/AuctionTimeWindow';
import { WinnerDecision } from '../value-objects/WinnerDecision';
import { PaymentState } from '../value-objects/PaymentState';
import { Bid } from './Bid';

/**
 * Immutable Domain Entity representing an Auction.
 * Follows the Persistence -> Mapper -> Domain Entity flow.
 * 
 * INTERIM ARCHITECTURAL NOTE (Phase 2.15):
 * `paymentState` and `paymentWindowOpenedAt` are currently stored on the Auction aggregate.
 * This is a temporary design choice to rapidly facilitate Phase 2.15. 
 * A future architectural phase will migrate this into a dedicated `Settlement` aggregate 
 * to prevent the Auction from accumulating disparate payment responsibilities.
 */
export class Auction {
  constructor(
    private readonly id: string,
    private readonly shopifyProductId: string,
    private readonly timeWindow: AuctionTimeWindow,
    private readonly status: AuctionStatus,
    private readonly startingPrice: BidAmount,
    private readonly currentPrice: BidAmount,
    private readonly minIncrement: BidAmount,
    private readonly reservePrice: BidAmount | null,
    private readonly winningBidId: string | null,
    private readonly version: number,
    private readonly extensionCount: number
  ) {}

  public getId(): string {
    return this.id;
  }

  public getShopifyProductId(): string {
    return this.shopifyProductId;
  }

  public getTimeWindow(): AuctionTimeWindow {
    return this.timeWindow;
  }

  public getStatus(): AuctionStatus {
    return this.status;
  }

  public getStartingPrice(): BidAmount {
    return this.startingPrice;
  }

  public getCurrentPrice(): BidAmount {
    return this.currentPrice;
  }

  public getMinIncrement(): BidAmount {
    return this.minIncrement;
  }

  public getReservePrice(): BidAmount | null {
    return this.reservePrice;
  }

  public getWinningBidId(): string | null {
    return this.winningBidId;
  }

  public getVersion(): number {
    return this.version;
  }

  public getExtensionCount(): number {
    return this.extensionCount;
  }



  public isAcceptingBids(currentTime: Date): boolean {
    return this.status.isActive() && this.timeWindow.isActiveAt(currentTime);
  }

  public withNewBid(bid: Bid, newStatus?: AllowedAuctionStatus): Auction {
    const updatedStatus = newStatus ? new AuctionStatus(newStatus) : this.status;
    
    return new Auction(
      this.id,
      this.shopifyProductId,
      this.timeWindow,
      updatedStatus,
      this.startingPrice,
      bid.getAmount(),
      this.minIncrement,
      this.reservePrice,
      bid.getId(),
      this.version + 1,
      this.extensionCount
    );
  }

  public withStatus(newStatus: AllowedAuctionStatus): Auction {
    return new Auction(
      this.id,
      this.shopifyProductId,
      this.timeWindow,
      new AuctionStatus(newStatus),
      this.startingPrice,
      this.currentPrice,
      this.minIncrement,
      this.reservePrice,
      this.winningBidId,
      this.version,
      this.extensionCount
    );
  }

  public withExtendedEndTime(newEndTime: Date): Auction {
    const newTimeWindow = new AuctionTimeWindow(this.timeWindow.getStartTime(), newEndTime);
    return new Auction(
      this.id,
      this.shopifyProductId,
      newTimeWindow,
      this.status,
      this.startingPrice,
      this.currentPrice,
      this.minIncrement,
      this.reservePrice,
      this.winningBidId,
      this.version,
      this.extensionCount + 1
    );
  }

  public close(winnerDecision: WinnerDecision): Auction {
    const winningBidId = winnerDecision.hasWinner && winnerDecision.winningBid ? winnerDecision.winningBid.getId() : null;
    return new Auction(
      this.id,
      this.shopifyProductId,
      this.timeWindow,
      new AuctionStatus('CLOSED'),
      this.startingPrice,
      this.currentPrice,
      this.minIncrement,
      this.reservePrice,
      winningBidId,
      this.version + 1,
      this.extensionCount
    );
  }
}
