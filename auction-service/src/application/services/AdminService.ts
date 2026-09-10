import { IAdminService, CreateAuctionPayload, UpdateAuctionConfigPayload } from '../../api/services/IAdminService';
import { IAuctionRepository } from '../ports/IAuctionRepository';
import { IEventPublisher } from '../ports/IEventPublisher';
import { ITimeProvider } from '../ports/ITimeProvider';
import { IAuctionTransactionBoundary } from '../ports/IAuctionTransactionBoundary';
import { AuctionDTO } from '../../api/dto/auction.dto';
import { InvalidAuctionTimeError, InvalidStateTransitionError } from '../exceptions/ApplicationErrors';
import { ulid } from 'ulidx';
import { AuctionTimeWindow, Auction, BidAmount, AuctionEngine } from '../../domain';

export class AdminService implements IAdminService {
  constructor(
    private auctionRepository: IAuctionRepository,
    private eventPublisher: IEventPublisher,
    private timeProvider: ITimeProvider,
    private transactionBoundary: IAuctionTransactionBoundary,
    private auctionEngine: AuctionEngine
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

  async forceStartAuction(auctionId: string, adminUserId: string): Promise<AuctionDTO> {
    const result = await this.transactionBoundary.executeWithLock(auctionId, async (auction, txContext) => {
      const currentStatus = auction.getStatus().getValue();
      if (currentStatus !== 'SCHEDULED' && currentStatus !== 'PREPARING') {
        throw new InvalidStateTransitionError(`Cannot force start auction from state ${currentStatus}. Allowed states: SCHEDULED, PREPARING`);
      }

      const updatedAuction = auction.withStatus('LIVE');

      await txContext.updateAuction(updatedAuction);

      await txContext.logAudit({
        action: 'ADMIN_FORCE_START',
        actorId: adminUserId,
        details: { newStatus: 'LIVE' }
      });

      return { eventType: 'auction.started' };
    });

    await this.eventPublisher.publish(result.eventType, { auctionId, timestamp: this.timeProvider.getCurrentTime().toISOString() });
    
    // Publish telemetry to admin global room
    await this.eventPublisher.publish('telemetry.admin.force_start', { auctionId, actorId: adminUserId });

    const updatedDto = await this.auctionRepository.findById(auctionId);
    return updatedDto!;
  }

  async forceCloseAuction(auctionId: string, adminUserId: string): Promise<AuctionDTO> {
    const result = await this.transactionBoundary.executeWithLock(auctionId, async (auction, txContext) => {
      const currentStatus = auction.getStatus().getValue();
      if (currentStatus !== 'LIVE' && currentStatus !== 'EXTENDED') {
        throw new InvalidStateTransitionError(`Cannot force close auction from state ${currentStatus}. Allowed states: LIVE, EXTENDED`);
      }

      const currentTime = this.timeProvider.getCurrentTime();
      const bids = await txContext.fetchBids(auctionId);

      // Route force-close through canonical domain method
      const closureResult = this.auctionEngine.forceCloseAuction(auction, bids, currentTime);

      await txContext.updateAuction(closureResult.updatedAuction);

      for (const event of closureResult.eventsToPublish) {
        await txContext.insertOutboxEvent(event);
      }
      
      await txContext.logAudit({
        action: 'ADMIN_FORCE_CLOSE',
        actorId: adminUserId,
        details: { newStatus: closureResult.updatedAuction.getStatus().getValue(), endTime: currentTime.toISOString() }
      });

      return { updatedAuction: closureResult.updatedAuction, eventsToPublish: closureResult.eventsToPublish };
    });

    for (const event of result.eventsToPublish) {
      await this.eventPublisher.publish(event.type, event.payload);
    }

    // Publish telemetry to admin global room
    await this.eventPublisher.publish('telemetry.admin.force_close', { auctionId, actorId: adminUserId });

    const updatedDto = await this.auctionRepository.findById(auctionId);
    return updatedDto!;
  }

  async updateAuctionConfiguration(auctionId: string, payload: UpdateAuctionConfigPayload, adminUserId: string): Promise<AuctionDTO> {
    await this.transactionBoundary.executeWithLock(auctionId, async (auction, txContext) => {
      // Configuration Freeze Domain Rule
      const currentStatus = auction.getStatus().getValue();
      const frozenStates = ['PREPARING', 'LIVE', 'EXTENDED', 'ENDING', 'ENDED', 'SETTLED', 'ARCHIVED'];
      if (frozenStates.includes(currentStatus)) {
        throw new InvalidStateTransitionError(`Configuration is frozen. Cannot edit auction in state ${currentStatus}`);
      }

      // Since Auction is immutable, we instantiate a new one with the updated values.
      // We increment the version here as well.
      const updatedAuction = new Auction(
        auction.getId(),
        auction.getShopifyProductId(),
        auction.getTimeWindow(),
        auction.getStatus(),
        payload.startingPricePaise !== undefined ? new BidAmount(payload.startingPricePaise) : auction.getStartingPrice(),
        auction.getCurrentPrice(),
        payload.minIncrementPaise !== undefined ? new BidAmount(payload.minIncrementPaise) : auction.getMinIncrement(),
        payload.reservePricePaise !== undefined ? new BidAmount(payload.reservePricePaise) : auction.getReservePrice(),
        auction.getWinningBidId(),
        auction.getVersion() + 1,
        auction.getExtensionCount(),
        payload.extensionDurationSec !== undefined ? payload.extensionDurationSec : auction.getExtensionDurationSec(),
        payload.extensionThresholdSec !== undefined ? payload.extensionThresholdSec : auction.getExtensionThresholdSec(),
        payload.maxExtensions !== undefined ? payload.maxExtensions : auction.getMaxExtensions()
      );

      await txContext.updateAuction(updatedAuction);

      await txContext.logAudit({
        action: 'ADMIN_UPDATE_CONFIG',
        actorId: adminUserId,
        details: { updatedFields: Object.keys(payload) }
      });
    });

    // Configuration updates are pre-live, so we optionally broadcast an update to clients who might be on the upcoming page
    await this.eventPublisher.publish('auction.config_updated', { auctionId, timestamp: this.timeProvider.getCurrentTime().toISOString() });

    const updatedDto = await this.auctionRepository.findById(auctionId);
    return updatedDto!;
  }
}
