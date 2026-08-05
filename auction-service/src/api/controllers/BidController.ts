import { FastifyRequest, FastifyReply } from 'fastify';
import { IBidService } from '../services/IBidService';
import { ResponseMapper } from '../responses/ResponseMapper';

export class BidController {
  constructor(private readonly bidService: IBidService) {}

  async listAuctionBids(request: FastifyRequest<{ Params: { id: string }, Querystring: { limit?: number; cursor?: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    const { limit = 20, cursor } = request.query;

    const result = await this.bidService.listAuctionBids(id, limit, cursor);
    
    return reply.status(200).send(ResponseMapper.success(request, result.bids, result.nextCursor));
  }

  async placeBid(request: FastifyRequest<{ Body: { auctionId: string, amountPaise: string, isProxy: boolean } }>, reply: FastifyReply) {
    const { auctionId, amountPaise, isProxy } = request.body;
    const userId = (request as any).userContext!.user.id;
    const idempotencyKey = request.headers['idempotency-key'] as string;

    const bid = await this.bidService.placeBid(auctionId, userId, amountPaise, isProxy, idempotencyKey);
    
    return reply.status(201).send(ResponseMapper.success(request, bid));
  }
}
