import { BidDTO } from '../../api/dto/bid.dto';

export interface CreateBidData {
  id: string;
  auctionId: string;
  userId: string;
  amountPaise: string;
  isProxy: boolean;
  createdAt: Date;
}

export interface IBidRepository {
  listByAuction(auctionId: string, limit: number, cursor?: string): Promise<{ bids: BidDTO[]; nextCursor?: string }>;
  create(data: CreateBidData): Promise<BidDTO>;
  getHighestBid(auctionId: string): Promise<BidDTO | null>;
}
