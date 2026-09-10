import { AuctionDTO } from '../dto/auction.dto';

export interface CreateAuctionPayload {
  shopifyProductId: string;
  startTime: string;
  endTime: string;
  startingPricePaise: string;
  minIncrementPaise: string;
  reservePricePaise?: string;
}

export interface UpdateAuctionConfigPayload {
  reservePricePaise?: string;
  minIncrementPaise?: string;
  startingPricePaise?: string;
  extensionThresholdSec?: number;
  extensionDurationSec?: number;
  maxExtensions?: number;
}

export interface IAdminService {
  createAuction(payload: CreateAuctionPayload, adminUserId: string, idempotencyKey: string): Promise<AuctionDTO>;
  forceStartAuction(auctionId: string, adminUserId: string): Promise<AuctionDTO>;
  forceCloseAuction(auctionId: string, adminUserId: string): Promise<AuctionDTO>;
  updateAuctionConfiguration(auctionId: string, payload: UpdateAuctionConfigPayload, adminUserId: string): Promise<AuctionDTO>;
}
