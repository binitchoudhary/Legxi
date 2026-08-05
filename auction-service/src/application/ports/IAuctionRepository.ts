import { AuctionDTO } from '../../api/dto/auction.dto';

export interface CreateAuctionData {
  id: string;
  shopifyProductId: string;
  startTime: Date;
  endTime: Date;
  startingPricePaise: string;
  minIncrementPaise: string;
  reservePricePaise?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
}

export interface IAuctionRepository {
  findById(id: string): Promise<AuctionDTO | null>;
  list(limit: number, cursor?: string, status?: string, shopifyProductId?: string): Promise<{ auctions: AuctionDTO[]; nextCursor?: string }>;
  create(data: CreateAuctionData): Promise<AuctionDTO>;
  updateStatus(id: string, status: string): Promise<AuctionDTO>;
}
