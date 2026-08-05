import { IAdminService, CreateAuctionPayload } from '../../api/services/IAdminService';
import { IAuctionRepository } from '../ports/IAuctionRepository';
import { IEventPublisher } from '../ports/IEventPublisher';
import { ITimeProvider } from '../ports/ITimeProvider';
import { AuctionDTO } from '../../api/dto/auction.dto';
import { InvalidAuctionTimeError } from '../exceptions/ApplicationErrors';
import { ulid } from 'ulidx';
import { AuctionTimeWindow } from '../../domain';

export class AdminService implements IAdminService {
  constructor(
    private auctionRepository: IAuctionRepository,
    private eventPublisher: IEventPublisher,
    private timeProvider: ITimeProvider
  ) {}

  async createAuction(payload: CreateAuctionPayload, adminUserId: string, idempotencyKey: string): Promise<AuctionDTO> {
    const startTime = new Date(payload.startTime);
    const endTime = new Date(payload.endTime);
    const now = this.timeProvider.getCurrentTime();

    // Use domain VO for validation (throws DomainError if start >= end)
    const timeWindow = new AuctionTimeWindow(startTime, endTime);
    
    // Application-level business rule: cannot create auction in the past
    if (!timeWindow.isBeforeStart(now)) {
      throw new InvalidAuctionTimeError('Start time cannot be in the past');
    }

    const auction = await this.auctionRepository.create({
      id: ulid(),
      shopifyProductId: payload.shopifyProductId,
      startTime,
      endTime,
      startingPricePaise: payload.startingPricePaise,
      minIncrementPaise: payload.minIncrementPaise,
      reservePricePaise: payload.reservePricePaise,
      status: 'DRAFT',
    });

    await this.eventPublisher.publish('AuctionCreated', auction);

    return auction;
  }
}
