import { Auction, Prisma } from '@prisma/client';
import { BaseRepository, DbClient } from './base.repository';
import { optimisticCondition, optimisticUpdate } from '../transaction';

export class AuctionRepository extends BaseRepository<Auction, Prisma.AuctionCreateInput, Prisma.AuctionUpdateInput> {
  protected get modelName() {
    return 'auction';
  }

  constructor() {
    super('auction');
  }

  /**
   * Retrieves an auction for update operations.
   */
  async findByIdWithLock(id: string, tx?: DbClient): Promise<Auction | null> {
    // Prisma does not have a native "SELECT FOR UPDATE" yet without raw SQL,
    // so we rely heavily on optimistic locking and serialization retries (P2034).
    return this.findById(id, tx);
  }

  /**
   * Updates an auction using optimistic locking.
   * Throws an error if the version does not match.
   */
  async updateOptimistically(
    id: string,
    currentVersion: number,
    data: Prisma.AuctionUpdateInput,
    tx?: DbClient
  ): Promise<Auction> {
    const client = this.getClient(tx);
    
    // We expect 1 row to be updated. If 0, someone else updated it.
    const result = await (client as { updateMany: (args: unknown) => Promise<{ count: number }> }).updateMany({
      where: optimisticCondition(id, currentVersion),
      data: {
        ...data,
        ...optimisticUpdate(currentVersion),
      }
    });

    if (result.count === 0) {
      throw new Error(`Optimistic locking failed for Auction ${id} at version ${currentVersion}`);
    }

    // Return the updated entity
    return (client as { findUniqueOrThrow: (args: unknown) => Promise<Auction> }).findUniqueOrThrow({ where: { id } });
  }
}
