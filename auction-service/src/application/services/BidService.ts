import { IBidService } from '../../api/services/IBidService';
import { IBidRepository } from '../ports/IBidRepository';
import { IAuctionRepository } from '../ports/IAuctionRepository';
import { IAuctionTransactionBoundary } from '../ports/IAuctionTransactionBoundary';
import { IEventPublisher } from '../ports/IEventPublisher';
import { ITimeProvider } from '../ports/ITimeProvider';
import { BidDTO } from '../../api/dto/bid.dto';
import { IdempotentIntentMismatchError } from '../../domain/exceptions/DomainErrors';
import { ulid } from 'ulidx';
import { AuctionEngine, BidAmount, Bid, BidIntent } from '../../domain';
import { AntiSnipingConfig } from '../../domain/config/AntiSnipingConfig';

export class BidService implements IBidService {
  constructor(
    private bidRepository: IBidRepository,
    private auctionRepository: IAuctionRepository,
    private transactionBoundary: IAuctionTransactionBoundary,
    private eventPublisher: IEventPublisher,
    private timeProvider: ITimeProvider,
    private auctionEngine: AuctionEngine,
    private antiSnipingConfig: AntiSnipingConfig
  ) {}

  async listAuctionBids(auctionId: string, limit: number, cursor?: string): Promise<{ bids: BidDTO[]; nextCursor?: string }> {
    return this.bidRepository.listByAuction(auctionId, limit, cursor);
  }

  async placeBid(auctionId: string, userId: string, amountPaise: string, isProxy: boolean, idempotencyKey: string): Promise<BidDTO> {
    const proposedAmount = new BidAmount(amountPaise);
    const currentTime = this.timeProvider.getCurrentTime();

    // Execute within the strict pessimistic lock boundary
    const result = await this.transactionBoundary.executeWithLock(auctionId, async (auction, txContext) => {
      // 1. Idempotency Check
      const existingIntent = await txContext.checkIdempotency(idempotencyKey);
      if (existingIntent) {
        if (
          existingIntent.getAuctionId() === auctionId &&
          existingIntent.getUserId() === userId &&
          existingIntent.getAmount().equals(proposedAmount)
        ) {
          // Replay: return materialized success representation
          return { isReplay: true, bidId: existingIntent.getBidId(), eventsToPublish: [] };
        } else {
          // Collision / Mismatch
          throw new IdempotentIntentMismatchError('Idempotent intent payload mismatch');
        }
      }

      // 2. Prepare Domain Bid Entity
      const bidId = ulid();
      const domainBid = new Bid(bidId, auctionId, userId, proposedAmount, isProxy, currentTime);
      
      // 3. Prepare Domain Intent Entity
      const domainIntent = new BidIntent(idempotencyKey, auctionId, userId, proposedAmount, bidId, currentTime);

      // 4. Domain Evaluation
      const evaluationResult = this.auctionEngine.evaluateBid(auction, domainBid, currentTime, this.antiSnipingConfig);

      // 5. Persist inside Transaction
      await txContext.persistBid(evaluationResult.updatedAuction, domainBid, domainIntent);
      await txContext.updateAuction(evaluationResult.updatedAuction);

      // 6. Audit Log
      await txContext.logAudit({
        action: 'BID_PLACED',
        actorId: userId,
        details: {
          bidId: bidId,
          amountPaise: proposedAmount.toString(),
          isProxy: isProxy
        }
      });

      return {
        isReplay: false,
        bidId,
        eventsToPublish: evaluationResult.eventsToPublish
      };
    });

    // 6. Publish Domain Events (after successful commit)
    for (const event of result.eventsToPublish) {
      await this.eventPublisher.publish(event.type, event.payload);
    }

    // 7. Reconstruct return object
    return {
      id: result.bidId as string,
      auctionId,
      userId,
      amountPaise,
      isProxy,
      status: 'ACCEPTED', // Synthesized for external API contract
      createdAt: currentTime.toISOString()
    };
  }
}

