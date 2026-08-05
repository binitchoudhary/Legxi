import { FastifyRequest, FastifyReply } from 'fastify';
import { IAuctionService } from '../services/IAuctionService';
import { ResponseMapper } from '../responses/ResponseMapper';
import { NotFoundError } from '../../shared/errors';

export class AuctionController {
  constructor(private readonly auctionService: IAuctionService) {}

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
}
