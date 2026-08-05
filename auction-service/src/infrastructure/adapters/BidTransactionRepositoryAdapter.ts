import { PrismaClient } from '@prisma/client';
import { IBidTransactionRepository, UpdateAuctionData } from '../../application/ports/IBidTransactionRepository';
import { CreateBidData } from '../../application/ports/IBidRepository';
import { mapPersistenceError } from './PersistenceErrorMapper';
import { ConcurrencyConflictError } from '../../application/exceptions/ApplicationErrors';
import { prisma } from '../../database';
import { optimisticCondition, optimisticUpdate } from '../../database/transaction';

/**
 * BidTransactionRepositoryAdapter
 * 
 * Orchestrates cross-entity persistence inside a single ACID transaction.
 * Does not validate domain logic. Just persists atomic state transitions.
 */
export class BidTransactionRepositoryAdapter implements IBidTransactionRepository {
  
  async placeBidTransactionally(auctionUpdate: UpdateAuctionData, newBid: CreateBidData): Promise<void> {
    return mapPersistenceError(async () => {
      // Execute the exact transaction guarantee via Prisma
      await prisma.$transaction(async (tx) => {
        // 1. UPDATE Auction
        const updateData: any = {
          currentPricePaise: BigInt(auctionUpdate.currentPricePaise),
          winningBidId: auctionUpdate.winningBidId,
          ...optimisticUpdate(auctionUpdate.version) // Bumps version
        };

        if (auctionUpdate.status) {
          updateData.status = auctionUpdate.status;
        }
        if (auctionUpdate.endTime) {
          updateData.endTime = auctionUpdate.endTime;
        }
        if (auctionUpdate.extensionCount !== undefined) {
          updateData.extensionCount = auctionUpdate.extensionCount;
        }

        const updateResult = await tx.auction.updateMany({
          where: optimisticCondition(auctionUpdate.id, auctionUpdate.version),
          data: updateData
        });

        if (updateResult.count === 0) {
          // Rolls back implicitly by throwing an error that bubbles out
          throw new ConcurrencyConflictError(
            `Optimistic concurrency conflict on Auction ${auctionUpdate.id} at version ${auctionUpdate.version}`
          );
        }

        // 2. INSERT Bid
        await tx.bid.create({
          data: {
            id: newBid.id,
            auctionId: newBid.auctionId,
            userId: newBid.userId,
            amountPaise: BigInt(newBid.amountPaise),
            isProxy: newBid.isProxy,
            status: newBid.status,
            createdAt: newBid.createdAt,
          }
        });
      });
    });
  }
}
