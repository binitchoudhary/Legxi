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
}
