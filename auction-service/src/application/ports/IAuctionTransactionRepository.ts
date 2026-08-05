export interface CloseAuctionData {
  id: string;
  version: number;
  status: string;
  winningBidId: string | null;
}

export interface IAuctionTransactionRepository {
  /**
   * Transaction Guarantee:
   * BEGIN
   * -> UPDATE Auction SET status=X, winningBidId=Y, version=version+1 WHERE id=Z AND version=V
   *    (If rows affected == 0, THROW ConcurrencyConflictError)
   * -> COMMIT
   * (On any error -> ROLLBACK. No partial persistence.)
   */
  closeAuctionTransactionally(updateData: CloseAuctionData): Promise<void>;
}
