import { FastifyRequest, FastifyReply } from 'fastify';
import { IAdminService } from '../services/IAdminService';
import { ResponseMapper } from '../responses/ResponseMapper';

export class AdminController {
  constructor(private readonly adminService: IAdminService) {}

  async createAuction(
    request: FastifyRequest<{ Body: { shopifyProductId: string, startTime: string, endTime: string, startingPricePaise: string, minIncrementPaise: string, reservePricePaise?: string } }>, 
    reply: FastifyReply
  ) {
    const payload = request.body;
    const adminUserId = (request as any).userContext!.user.id;
    const idempotencyKey = request.headers['idempotency-key'] as string;

    const auction = await this.adminService.createAuction(payload, adminUserId, idempotencyKey);
    
    return reply.status(201).send(ResponseMapper.success(request, auction));
  }

  async forceStartAuction(
    request: FastifyRequest<{ Params: { id: string } }>, 
    reply: FastifyReply
  ) {
    const auctionId = request.params.id;
    const adminUserId = (request as any).userContext!.user.id;

    const auction = await this.adminService.forceStartAuction(auctionId, adminUserId);
    
    return reply.status(200).send(ResponseMapper.success(request, auction));
  }

  async forceCloseAuction(
    request: FastifyRequest<{ Params: { id: string } }>, 
    reply: FastifyReply
  ) {
    const auctionId = request.params.id;
    const adminUserId = (request as any).userContext!.user.id;

    const auction = await this.adminService.forceCloseAuction(auctionId, adminUserId);
    
    return reply.status(200).send(ResponseMapper.success(request, auction));
  }

  async updateAuctionConfig(
    request: FastifyRequest<{ Params: { id: string }, Body: import('../services/IAdminService').UpdateAuctionConfigPayload }>, 
    reply: FastifyReply
  ) {
    const auctionId = request.params.id;
    const payload = request.body;
    const adminUserId = (request as any).userContext!.user.id;

    const auction = await this.adminService.updateAuctionConfiguration(auctionId, payload, adminUserId);
    
    return reply.status(200).send(ResponseMapper.success(request, auction));
  }
}
