import { AuctionDTO } from '../dto/auction.dto';

export interface IAuctionService {
  listAuctions(limit: number, cursor?: string, status?: string, shopifyProductId?: string): Promise<{ auctions: AuctionDTO[]; nextCursor?: string }>;
  getAuction(id: string): Promise<AuctionDTO | null>;
  closeAuction(id: string): Promise<void>;
}
