import { IAuctionService } from '../../api/services/IAuctionService';
import { IAuctionRepository } from '../ports/IAuctionRepository';
import { IBidRepository } from '../ports/IBidRepository';
import { IAuctionTransactionRepository } from '../ports/IAuctionTransactionRepository';
import { IAuctionLifecycleTransactionRepository } from '../ports/IAuctionLifecycleTransactionRepository';
import { IEventPublisher } from '../ports/IEventPublisher';
import { ITimeProvider } from '../ports/ITimeProvider';
import { AuctionDTO } from '../../api/dto/auction.dto';
import { AuctionNotFoundError } from '../exceptions/ApplicationErrors';
import { AuctionEngine } from '../../domain';
import { DomainMapper } from '../mappers/DomainMapper';
import { RetryExecutor } from '../utils/RetryExecutor';

export class AuctionService implements IAuctionService {
  constructor(
    private auctionRepository: IAuctionRepository,
    private bidRepository: IBidRepository,
    private auctionTransactionRepository: IAuctionTransactionRepository,
    private auctionLifecycleTransactionRepository: IAuctionLifecycleTransactionRepository,
    private eventPublisher: IEventPublisher,
    private timeProvider: ITimeProvider,
    private auctionEngine: AuctionEngine,
    private retryExecutor: RetryExecutor
  ) {}

  async listAuctions(limit: number, cursor?: string, status?: string, shopifyProductId?: string): Promise<{ auctions: AuctionDTO[]; nextCursor?: string }> {
    return this.auctionRepository.list(limit, cursor, status, shopifyProductId);
  }

  async getAuction(id: string): Promise<AuctionDTO | null> {
    const auction = await this.auctionRepository.findById(id);
    if (!auction) {
      throw new AuctionNotFoundError(id);
    }
    return auction;
  }

  async closeAuction(id: string): Promise<void> {
    const eventsToPublish = await this.retryExecutor.executeWithRetry(
      'closeAuction',
      { auctionId: id },
      async () => {
        // 1. Fetch Auction
        const auctionDTO = await this.auctionRepository.findById(id);
        if (!auctionDTO) {
          throw new AuctionNotFoundError(id);
        }

        // 2. Fetch all bids
        // Note: For extreme scalability, pagination/streaming could be considered here
        // or passing limits. For Phase 2.12, we fetch all to provide complete context.
        // Assuming listByAuction fetches all if limit is large enough, or we use a dedicated fetch all method.
        // We will fetch up to a large number of bids for now.
        const bidsResponse = await this.bidRepository.listByAuction(id, 10000); 
        const bids = bidsResponse.bids.map(DomainMapper.toDomainBid);

        const auction = DomainMapper.toDomainAuction(auctionDTO);
        const currentTime = this.timeProvider.getCurrentTime();

        // 3. Delegate to Domain Layer
        const result = this.auctionEngine.evaluateAuctionClosure(auction, bids, currentTime);

        if (result.isIdempotentNoOp) {
          // Already closed or processed, return empty events to avoid duplicate publishing
          return [];
        }

        // 4. Delegate Atomic Persistence
        const updateData = {
          id: result.updatedAuction.getId(),
          version: result.updatedAuction.getVersion() - 1, // evaluateAuctionClosure bumped version in memory, so previous version is version - 1
          status: result.updatedAuction.getStatus().getValue(),
          winningBidId: result.updatedAuction.getWinningBidId()
        };

        // Note: the updatedAuction.getVersion() was bumped by .close(), so the expected DB version is (version - 1)
        await this.auctionTransactionRepository.closeAuctionTransactionally(updateData);

        return result.eventsToPublish;
      }
    );

    // 5. Publish Domain Events
    for (const event of eventsToPublish) {
      await this.eventPublisher.publish(event.type, event.payload);
    }
  }
}
