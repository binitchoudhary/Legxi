import { FastifyInstance } from 'fastify';
import { AdminController } from '../controllers/AdminController';
import { IAdminService } from '../services/IAdminService';
import { CreateAuctionRequestSchema, UpdateAuctionConfigRequestSchema, AuctionIdParamSchema } from '../dto/auction.dto';
import { RequestIdHeaderSchema, IdempotencyHeaderSchema } from '../dto/headers.dto';
import { requireIdempotency } from '../middleware/IdempotencyMiddleware';
import { authenticateIdentity } from '../../modules/auth/middleware/authenticate';
import { canManageAuction } from '../../modules/auth/middleware/authorize';
import { auditContextMiddleware } from '../middleware/AuditMiddleware';

export default async function adminRoutes(app: FastifyInstance, opts: { adminService: IAdminService }) {
  const controller = new AdminController(opts.adminService);

  app.post<{ Body: import('zod').infer<typeof CreateAuctionRequestSchema> }>('/auctions', {
    preValidation: [authenticateIdentity, auditContextMiddleware, canManageAuction, requireIdempotency],
    schema: {
      headers: RequestIdHeaderSchema.merge(IdempotencyHeaderSchema),
      body: CreateAuctionRequestSchema
    }
  }, controller.createAuction.bind(controller));

  app.post<{ Params: import('zod').infer<typeof AuctionIdParamSchema> }>('/auctions/:id/force-start', {
    preValidation: [authenticateIdentity, auditContextMiddleware, canManageAuction, requireIdempotency],
    schema: {
      headers: RequestIdHeaderSchema.merge(IdempotencyHeaderSchema),
      params: AuctionIdParamSchema
    }
  }, controller.forceStartAuction.bind(controller));

  app.post<{ Params: import('zod').infer<typeof AuctionIdParamSchema> }>('/auctions/:id/force-close', {
    preValidation: [authenticateIdentity, auditContextMiddleware, canManageAuction, requireIdempotency],
    schema: {
      headers: RequestIdHeaderSchema.merge(IdempotencyHeaderSchema),
      params: AuctionIdParamSchema
    }
  }, controller.forceCloseAuction.bind(controller));

  app.patch<{ Params: import('zod').infer<typeof AuctionIdParamSchema>, Body: import('zod').infer<typeof UpdateAuctionConfigRequestSchema> }>('/auctions/:id/config', {
    preValidation: [authenticateIdentity, auditContextMiddleware, canManageAuction, requireIdempotency],
    schema: {
      headers: RequestIdHeaderSchema.merge(IdempotencyHeaderSchema),
      params: AuctionIdParamSchema,
      body: UpdateAuctionConfigRequestSchema
    }
  }, controller.updateAuctionConfig.bind(controller));
}
