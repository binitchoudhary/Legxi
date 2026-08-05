export interface ISettlementTransactionRepository {
  /**
   * Executes a unit of work that requires atomic persistence (e.g. outbox pattern).
   * Note: In a pure DDD model, aggregates are saved independently, but if the persistence
   * of the aggregate MUST be transacted with outbox events, this port is used.
   */
  executeInTransaction<T>(work: (tx: any) => Promise<T>): Promise<T>;
}
