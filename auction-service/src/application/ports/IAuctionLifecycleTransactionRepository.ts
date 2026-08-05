export interface UpdateAuctionStateData {
  id: string;
  version: number;
  status: string;
}

export interface IAuctionLifecycleTransactionRepository {
  /**
   * Transaction Guarantee:
   * BEGIN
   * -> UPDATE Auction SET status=X, version=version+1 WHERE id=Z AND version=V
   *    (If rows affected == 0, THROW ConcurrencyConflictError)
   * -> COMMIT
   * (On any error -> ROLLBACK. No partial persistence.)
   */
  updateAuctionStateTransactionally(updateData: UpdateAuctionStateData): Promise<void>;
}
