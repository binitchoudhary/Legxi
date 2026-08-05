import { CreateBidData } from './IBidRepository';

export interface UpdateAuctionData {
  id: string;
  version: number;
  currentPricePaise: string;
  winningBidId: string;
  // Note: we can expand this if other fields change on bid (e.g. status)
  status?: string;
  endTime?: Date;
  extensionCount?: number;
}

export interface IBidTransactionRepository {
  /**
   * Transaction Guarantee:
   * BEGIN
   * -> UPDATE Auction SET version=N+1, currentPrice=X WHERE id=Y AND version=N
   *    (If rows affected == 0, THROW ConcurrencyConflictError)
   * -> INSERT Bid
   * -> COMMIT
   * (On any error -> ROLLBACK. No partial persistence.)
   */
  placeBidTransactionally(auctionUpdate: UpdateAuctionData, newBid: CreateBidData): Promise<void>;
}
