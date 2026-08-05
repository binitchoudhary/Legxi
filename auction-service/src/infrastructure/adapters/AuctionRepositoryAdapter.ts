import { Auction } from '@prisma/client';
import { IAuctionRepository, CreateAuctionData } from '../../application/ports/IAuctionRepository';
import { AuctionDTO } from '../../api/dto/auction.dto';
import { AuctionRepository } from '../../database/repositories/auction.repository';
import { mapPersistenceError } from './PersistenceErrorMapper';

/**
 * AuctionRepositoryAdapter
 *
 * Persistence adapter that satisfies the IAuctionRepository port.
 * Wraps the existing AuctionRepository (Prisma abstraction) and translates
 * between Prisma entity types and application-layer DTOs.
 *
 * This adapter MUST NOT contain:
 * - Business logic or validation
 * - Event publishing
 * - Auction engine rules (bid increments, winner calculation, anti-sniping)
 * - Transport concerns (HTTP, WebSocket)
 */
export class AuctionRepositoryAdapter implements IAuctionRepository {
  constructor(private readonly dbRepo: AuctionRepository) {}

  async findById(id: string): Promise<AuctionDTO | null> {
    return mapPersistenceError(async () => {
      const auction = await this.dbRepo.findById(id);
      if (!auction) return null;

      // Filter soft-deleted records
      if (auction.deletedAt !== null) return null;

      return this.mapToDTO(auction);
    });
  }

  async list(limit: number, cursor?: string, status?: string, shopifyProductId?: string): Promise<{ auctions: AuctionDTO[]; nextCursor?: string }> {
    return mapPersistenceError(async () => {
      // Build where clause with soft-delete filter
      const where: Record<string, unknown> = { deletedAt: null };
      if (status) {
        where.status = status;
      }
      if (shopifyProductId) {
        where.shopifyProductId = shopifyProductId;
      }

      // Delegate to existing database repository
      const auctions = await this.dbRepo.findMany(where, { startTime: 'asc' }, limit, cursor);

      return {
        auctions: auctions.map((a) => this.mapToDTO(a)),
        nextCursor: auctions.length === limit ? auctions[auctions.length - 1].id : undefined
      };
    });
  }

  async create(data: CreateAuctionData): Promise<AuctionDTO> {
    return mapPersistenceError(async () => {
      // Delegate to existing database repository
      const created = await this.dbRepo.create({
        id: data.id,
        shopifyProductId: data.shopifyProductId,
        startTime: data.startTime,
        endTime: data.endTime,
        startingPricePaise: BigInt(data.startingPricePaise),
        minIncrementPaise: BigInt(data.minIncrementPaise),
        reservePricePaise: data.reservePricePaise ? BigInt(data.reservePricePaise) : null,
        status: data.status,
        currentPricePaise: BigInt(data.startingPricePaise),
        version: 1
      });

      return this.mapToDTO(created);
    });
  }

  async updateStatus(id: string, status: string): Promise<AuctionDTO> {
    return mapPersistenceError(async () => {
      // Fetch current version for optimistic locking
      const current = await this.dbRepo.findById(id);
      if (!current) {
        throw new Error(`Auction ${id} not found for status update`);
      }

      // Delegate to existing database repository's optimistic update
      const updated = await this.dbRepo.updateOptimistically(
        id,
        current.version,
        { status }
      );

      return this.mapToDTO(updated);
    });
  }

  /**
   * Maps a Prisma Auction entity to the application-layer AuctionDTO.
   * Pure data transformation — no business logic.
   */
  private mapToDTO(auction: Auction): AuctionDTO {
    return {
      id: auction.id,
      shopifyProductId: auction.shopifyProductId,
      startTime: auction.startTime.toISOString(),
      endTime: auction.endTime.toISOString(),
      startingPricePaise: auction.startingPricePaise.toString(),
      currentPricePaise: auction.currentPricePaise.toString(),
      minIncrementPaise: auction.minIncrementPaise.toString(),
      reservePricePaise: auction.reservePricePaise?.toString() ?? null,
      status: auction.status,
      winningBidId: auction.winningBidId ?? null,
      version: auction.version,
      extensionCount: auction.extensionCount,
      createdAt: auction.createdAt.toISOString(),
      updatedAt: auction.updatedAt.toISOString()
    };
  }
}
