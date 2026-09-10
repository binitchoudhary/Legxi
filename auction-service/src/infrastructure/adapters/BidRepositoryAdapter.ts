import { Bid } from '@prisma/client';
import { IBidRepository, CreateBidData } from '../../application/ports/IBidRepository';
import { BidDTO } from '../../api/dto/bid.dto';
import { BidRepository } from '../../database/repositories/bid.repository';
import { mapPersistenceError } from './PersistenceErrorMapper';

/**
 * BidRepositoryAdapter
 *
 * Persistence adapter that satisfies the IBidRepository port.
 * Wraps the existing BidRepository (Prisma abstraction) and translates
 * between Prisma entity types and application-layer DTOs.
 *
 * This adapter MUST NOT contain:
 * - Business logic or validation (bid increment, winner calculation)
 * - Event publishing
 * - Auction engine rules (anti-sniping, ranking)
 * - Transport concerns (HTTP, WebSocket)
 */
export class BidRepositoryAdapter implements IBidRepository {
  constructor(private readonly dbRepo: BidRepository) {}

  async listByAuction(auctionId: string, limit: number, cursor?: string): Promise<{ bids: BidDTO[]; nextCursor?: string }> {
    return mapPersistenceError(async () => {
      // Delegate to existing database repository
      const bids = await this.dbRepo.findMany({ auctionId }, { amountPaise: 'desc' }, limit, cursor);
      return {
        bids: bids.map((b) => this.mapToDTO(b)),
        nextCursor: bids.length === limit ? bids[bids.length - 1].id : undefined
      };
    });
  }

  async create(data: CreateBidData): Promise<BidDTO> {
    return mapPersistenceError(async () => {
      // Use the base repository's create method (inherited by BidRepository)
      // to pass the full payload including id and createdAt from the port.
      //
      // Technical note: We use dbRepo.create() (BaseRepository) instead of
      // dbRepo.createBid() because createBid() generates its own id and
      // omits createdAt from the input type. The application layer provides
      // both values via CreateBidData, so we need to pass them through.
      // The base create() delegates to Prisma's create() which accepts
      // unchecked scalar fields (auctionId, userId) via dynamic access.
      const created = await this.dbRepo.create({
        id: data.id,
        auctionId: data.auctionId,
        userId: data.userId,
        amountPaise: BigInt(data.amountPaise),
        isProxy: data.isProxy,
        createdAt: data.createdAt,
      } as any);

      return this.mapToDTO(created);
    });
  }

  async getHighestBid(auctionId: string): Promise<BidDTO | null> {
    return mapPersistenceError(async () => {
      // Delegate to existing database repository — fetch top 1 by amount desc
      const bids = await this.dbRepo.findMany({ auctionId }, { amountPaise: 'desc' }, 1);
      if (bids.length === 0) return null;
      return this.mapToDTO(bids[0]);
    });
  }

  /**
   * Maps a Prisma Bid entity to the application-layer BidDTO.
   * Pure data transformation — no business logic.
   */
  private mapToDTO(bid: Bid): BidDTO {
    return {
      id: bid.id,
      auctionId: bid.auctionId,
      userId: bid.userId,
      amountPaise: bid.amountPaise.toString(),
      isProxy: bid.isProxy,
      status: 'ACCEPTED', // Synthesized for external API contract
      createdAt: bid.createdAt.toISOString()
    };
  }
}
