import { FastifyRequest, FastifyReply } from 'fastify';
import { IAuctionService } from '../services/IAuctionService';
import { IBidService } from '../services/IBidService';
import { ResponseMapper } from '../responses/ResponseMapper';
import { NotFoundError } from '../../shared/errors';
import Redis from 'ioredis';
import { logger } from '../../shared/logger';

export class AuctionController {
  constructor(
    private readonly auctionService: IAuctionService,
    private readonly bidService: IBidService,
    private readonly redisClient: Redis
  ) {}

  async listAuctions(request: FastifyRequest<{ Querystring: { limit?: number; cursor?: string; status?: string; shopifyProductId?: string } }>, reply: FastifyReply) {
    const { limit = 20, cursor, status, shopifyProductId } = request.query;

    const result = await this.auctionService.listAuctions(limit, cursor, status, shopifyProductId);
    
    return reply.status(200).send(ResponseMapper.success(request, result.auctions, result.nextCursor));
  }

  async getAuction(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;

    const auction = await this.auctionService.getAuction(id);
    if (!auction) {
      throw new NotFoundError('Auction not found');
    }

    return reply.status(200).send(ResponseMapper.success(request, auction));
  }

  async getSnapshot(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;

    // 1. Fetch durable aggregate state
    const auction = await this.auctionService.getAuction(id);
    if (!auction) {
      throw new NotFoundError('Auction not found');
    }

    // 2. Fetch recent bids (highest bids). limit to 50 for the snapshot.
    const bidsResult = await this.bidService.listAuctionBids(id, 50, undefined);

    // 3. Fetch ephemeral sequence from Redis.
    let sequence: number | null = null;
    try {
      const seqStr = await this.redisClient.get(`auction:${id}:seq`);
      if (seqStr) {
        sequence = parseInt(seqStr, 10);
      }
    } catch (err) {
      logger.error({ err, auctionId: id }, 'Failed to fetch Redis sequence for snapshot. Returning null sequence.');
      sequence = null;
    }

    const snapshot = {
      auction,
      highestBids: bidsResult.bids,
      serverTime: new Date().toISOString(),
      sequence
    };

    return reply.status(200).send(ResponseMapper.success(request, snapshot));
  }
}
