import { InvalidAuctionTimeWindowError } from '../exceptions/DomainErrors';

/**
 * Immutable Value Object representing the active time window of an auction.
 */
export class AuctionTimeWindow {
  private readonly start: Date;
  private readonly end: Date;

  constructor(startTime: Date, endTime: Date) {
    if (startTime.getTime() >= endTime.getTime()) {
      throw new InvalidAuctionTimeWindowError('Auction start time must be strictly before end time');
    }
    
    // We clone the dates to guarantee immutability
    this.start = new Date(startTime.getTime());
    this.end = new Date(endTime.getTime());
  }

  public getStartTime(): Date {
    return new Date(this.start.getTime());
  }

  public getEndTime(): Date {
    return new Date(this.end.getTime());
  }

  public isActiveAt(time: Date): boolean {
    return time.getTime() >= this.start.getTime() && time.getTime() <= this.end.getTime();
  }

  public isBeforeStart(time: Date): boolean {
    return time.getTime() < this.start.getTime();
  }

  public isAfterEnd(time: Date): boolean {
    return time.getTime() > this.end.getTime();
  }

  /**
   * Extension point for Phase 2.10+: Automatic auction extension (anti-sniping)
   * Returns a new instance with an extended end time.
   */
  public extendEndTime(extensionMs: number): AuctionTimeWindow {
    const newEndTime = new Date(this.end.getTime() + extensionMs);
    return new AuctionTimeWindow(this.start, newEndTime);
  }
}
