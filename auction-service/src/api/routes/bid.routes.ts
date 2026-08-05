import { FastifyInstance } from 'fastify';
import { BidController } from '../controllers/BidController';
import { IBidService } from '../services/IBidService';
import { PlaceBidRequestSchema } from '../dto/bid.dto';
import { CursorQuerySchema, AuctionIdParamSchema } from '../dto/auction.dto';
import { RequestIdHeaderSchema, IdempotencyHeaderSchema } from '../dto/headers.dto';
import { requireIdempotency } from '../middleware/IdempotencyMiddleware';
import { authenticateIdentity } from '../../modules/auth/middleware/authenticate';
import { auditContextMiddleware } from '../middleware/AuditMiddleware';

export default async function bidRoutes(app: FastifyInstance, opts: { bidService: IBidService }) {
  const controller = new BidController(opts.bidService);

  app.post<{ Body: import('zod').infer<typeof PlaceBidRequestSchema> }>('/bids', {
    preValidation: [authenticateIdentity, auditContextMiddleware, requireIdempotency],
    schema: {
      headers: RequestIdHeaderSchema.merge(IdempotencyHeaderSchema),
      body: PlaceBidRequestSchema
    }
  }, controller.placeBid.bind(controller));

  app.get('/auctions/:id/bids', {
    schema: {
      headers: RequestIdHeaderSchema,
      params: AuctionIdParamSchema,
      querystring: CursorQuerySchema
    }
  }, controller.listAuctionBids.bind(controller));
}
