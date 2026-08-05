import { FastifyInstance } from 'fastify';
import { AdminController } from '../controllers/AdminController';
import { IAdminService } from '../services/IAdminService';
import { CreateAuctionRequestSchema } from '../dto/auction.dto';
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
}
