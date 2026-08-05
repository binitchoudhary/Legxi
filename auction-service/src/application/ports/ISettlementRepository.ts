import { Settlement } from '../../domain/models/Settlement';

export interface ISettlementRepository {
  findById(settlementId: string): Promise<Settlement | null>;
  findByAuctionId(auctionId: string): Promise<Settlement | null>;
  save(settlement: Settlement): Promise<void>;
  updateOptimistically(settlement: Settlement, currentVersion: number): Promise<void>;
}
