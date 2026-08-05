import { IAuctionTransactionRepository, CloseAuctionData } from '../../application/ports/IAuctionTransactionRepository';
import { mapPersistenceError } from './PersistenceErrorMapper';
import { ConcurrencyConflictError } from '../../application/exceptions/ApplicationErrors';
import { prisma } from '../../database';
import { optimisticCondition, optimisticUpdate } from '../../database/transaction';

export class AuctionTransactionRepositoryAdapter implements IAuctionTransactionRepository {
  async closeAuctionTransactionally(updateData: CloseAuctionData): Promise<void> {
    return mapPersistenceError(async () => {
      // Execute the exact transaction guarantee via Prisma
      await prisma.$transaction(async (tx) => {
        const payload: any = {
          status: updateData.status,
          ...optimisticUpdate(updateData.version) // Bumps version
        };

        if (updateData.winningBidId) {
          payload.winningBidId = updateData.winningBidId;
        }

        const updateResult = await tx.auction.updateMany({
          where: optimisticCondition(updateData.id, updateData.version),
          data: payload
        });

        if (updateResult.count === 0) {
          // Rolls back implicitly by throwing an error that bubbles out
          throw new ConcurrencyConflictError(
            `Optimistic concurrency conflict on Auction ${updateData.id} at version ${updateData.version}`
          );
        }
      });
    });
  }
}
