import { AuctionDTO } from '../dto/auction.dto';

export interface CreateAuctionPayload {
  shopifyProductId: string;
  startTime: string;
  endTime: string;
  startingPricePaise: string;
  minIncrementPaise: string;
  reservePricePaise?: string;
}

export interface IAdminService {
  createAuction(payload: CreateAuctionPayload, adminUserId: string, idempotencyKey: string): Promise<AuctionDTO>;
}
