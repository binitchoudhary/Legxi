import { BidDTO } from '../dto/bid.dto';

export interface IBidService {
  listAuctionBids(auctionId: string, limit: number, cursor?: string): Promise<{ bids: BidDTO[]; nextCursor?: string }>;
  placeBid(auctionId: string, userId: string, amountPaise: string, isProxy: boolean, idempotencyKey: string): Promise<BidDTO>;
}
