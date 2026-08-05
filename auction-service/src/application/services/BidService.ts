import { IBidService } from '../../api/services/IBidService';
import { IBidRepository } from '../ports/IBidRepository';
import { IAuctionRepository } from '../ports/IAuctionRepository';
import { IBidTransactionRepository } from '../ports/IBidTransactionRepository';
import { IEventPublisher } from '../ports/IEventPublisher';
import { ITimeProvider } from '../ports/ITimeProvider';
import { BidDTO } from '../../api/dto/bid.dto';
import { AuctionNotFoundError } from '../exceptions/ApplicationErrors';
import { ulid } from 'ulidx';
import { AuctionEngine, BidAmount, Bid } from '../../domain';
import { DomainMapper } from '../mappers/DomainMapper';
import { RetryExecutor } from '../utils/RetryExecutor';
import { AntiSnipingConfig } from '../../domain/config/AntiSnipingConfig';

export class BidService implements IBidService {
  constructor(
    private bidRepository: IBidRepository,
    private auctionRepository: IAuctionRepository,
    private bidTransactionRepository: IBidTransactionRepository,
    private eventPublisher: IEventPublisher,
    private timeProvider: ITimeProvider,
    private auctionEngine: AuctionEngine,
    private retryExecutor: RetryExecutor,
    private antiSnipingConfig: AntiSnipingConfig
  ) {}

  async listAuctionBids(auctionId: string, limit: number, cursor?: string): Promise<{ bids: BidDTO[]; nextCursor?: string }> {
    return this.bidRepository.listByAuction(auctionId, limit, cursor);
  }

  async placeBid(auctionId: string, userId: string, amountPaise: string, isProxy: boolean, idempotencyKey: string): Promise<BidDTO> {
    // 1. Validate Request Structure is done by REST/WS layer DTOs

    // Execute the full operation within a retry loop to handle optimistic locking conflicts
    const result = await this.retryExecutor.executeWithRetry(
      'placeBid',
      { auctionId },
      async () => {
        // 2. Validate Auction Existence (must re-fetch on every retry)
        const auctionDTO = await this.auctionRepository.findById(auctionId);
        if (!auctionDTO) {
          throw new AuctionNotFoundError(auctionId);
        }

        // 3. Delegate to Domain Layer (Auction Engine)
        const auction = DomainMapper.toDomainAuction(auctionDTO);
        // 3. Prepare Bid Entity for domain evaluation
        const proposedAmount = new BidAmount(amountPaise);
        const currentTime = this.timeProvider.getCurrentTime();
        const bidId = ulid();
        const domainBid = new Bid(
          bidId,
          auctionId,
          userId,
          proposedAmount,
          isProxy,
          'ACCEPTED',
          currentTime
        );
        
        // 4. Delegate to Domain Layer (Auction Engine) for validation and state transition
        // Will throw DomainError if rules are violated
        const evaluationResult = this.auctionEngine.evaluateBid(auction, domainBid, currentTime, this.antiSnipingConfig);

        const updatedAuction = evaluationResult.updatedAuction;

        // Prepare raw DTOs for persistence adapter
        const newBidData = {
          id: bidId,
          auctionId,
          userId,
          amountPaise,
          isProxy,
          status: 'ACCEPTED' as const,
          createdAt: currentTime,
        };

        const updateAuctionData = {
          id: auction.getId(),
          version: auction.getVersion(), // Expected version for optimistic lock
          currentPricePaise: updatedAuction.getCurrentPrice().toString(),
          winningBidId: updatedAuction.getWinningBidId() as string,
          endTime: updatedAuction.getTimeWindow().getEndTime(),
          extensionCount: updatedAuction.getExtensionCount()
        };

        // 5. Delegate Atomic Persistence (will throw ConcurrencyConflictError if version changed)
        await this.bidTransactionRepository.placeBidTransactionally(updateAuctionData, newBidData);

        return {
          newBidData,
          eventsToPublish: evaluationResult.eventsToPublish
        };
      }
    );

    // 6. Publish Domain Events (only after transaction commits fully)
    // Avoid hardcoding event ordering, publish all events returned by the engine.
    for (const event of result.eventsToPublish) {
      await this.eventPublisher.publish(event.type, event.payload);
    }

    return {
      id: result.newBidData.id,
      auctionId: result.newBidData.auctionId,
      userId: result.newBidData.userId,
      amountPaise: result.newBidData.amountPaise,
      isProxy: result.newBidData.isProxy,
      status: result.newBidData.status,
      createdAt: result.newBidData.createdAt.toISOString()
    };
  }
}
