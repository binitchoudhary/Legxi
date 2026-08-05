import { Auction } from '../models/Auction';
import { AntiSnipingConfig, ExtensionDecision } from '../config/AntiSnipingConfig';

/**
 * Domain policy for evaluating anti-sniping rules.
 * This policy is stateless. It relies on the provided configuration and time.
 */
export class AuctionExtensionPolicy {
  /**
   * Evaluates if a bid placed at currentTime should extend the auction.
   * Returns a domain decision without mutating the auction.
   */
  public evaluate(auction: Auction, currentTime: Date, config: AntiSnipingConfig): ExtensionDecision {
    if (auction.getExtensionCount() >= config.maxExtensions) {
      return { shouldExtend: false };
    }

    const currentEndTime = auction.getTimeWindow().getEndTime().getTime();
    const timeUntilEndMs = currentEndTime - currentTime.getTime();

    // If the bid is placed within the trigger window, extend the auction.
    if (timeUntilEndMs <= config.triggerWindowMs) {
      const newEndTime = new Date(currentEndTime + config.extensionDurationMs);
      return { shouldExtend: true, newEndTime };
    }

    return { shouldExtend: false };
  }
}
