import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ApiDependencies } from '../index';
import { authenticateIdentity } from '../../../modules/auth/middleware/authenticate';
import { canManageAuction } from '../../../modules/auth/middleware/authorize';
import { auditContextMiddleware } from '../../middleware/AuditMiddleware';
import { requireIdempotency } from '../../middleware/IdempotencyMiddleware';
import { RequestIdHeaderSchema, IdempotencyHeaderSchema } from '../../dto/headers.dto';
import { z } from 'zod';
import { ShopifyPaymentGateway } from '../../../infrastructure/adapters/ShopifyPaymentGateway';
import { logger } from '../../../shared/logger';

const SettlementIdParamSchema = z.object({
  id: z.string().min(1)
});

export default async function reconciliationRoutes(app: FastifyInstance, opts: ApiDependencies) {
  
  app.post<{ Params: import('zod').infer<typeof SettlementIdParamSchema> }>('/settlements/:id/sync', {
    preValidation: [authenticateIdentity, auditContextMiddleware, canManageAuction, requireIdempotency],
    schema: {
      headers: RequestIdHeaderSchema.merge(IdempotencyHeaderSchema),
      params: SettlementIdParamSchema
    }
  }, async (req: FastifyRequest<{ Params: import('zod').infer<typeof SettlementIdParamSchema> }>, reply: FastifyReply) => {
    try {
      const settlementId = req.params.id;

      // 1. Fetch Local Settlement
      const settlement = await opts.settlementService.getSettlement(settlementId);
      if (!settlement) {
        return reply.status(404).send({ error: 'Settlement not found' });
      }

      if (settlement.settlementStatus === 'COMPLETED') {
        return reply.status(200).send({ ok: true, message: 'Already processed' });
      }

      const auction = await opts.auctionService.getAuction(settlement.auctionId);
      if (!auction) {
        return reply.status(404).send({ error: 'Associated Auction not found' });
      }

      const draftOrderId = settlement.providerReference?.providerPaymentId;
      if (!draftOrderId || settlement.providerReference?.provider !== 'shopify') {
        return reply.status(400).send({ error: 'Settlement does not have a valid Shopify Draft Order reference' });
      }

      // 2. Pre-Lock External Validation via Shopify Admin API
      const shopifyGateway = opts.paymentGateway as ShopifyPaymentGateway;
      if (typeof shopifyGateway.syncSettlementOrder !== 'function') {
        return reply.status(500).send({ error: 'PaymentGateway does not support synchronization' });
      }

      const syncResult = await shopifyGateway.syncSettlementOrder(
        draftOrderId,
        settlement.settlementId,
        settlement.auctionId,
        settlement.winnerId,
        auction.currentPricePaise.toString()
      );

      if (!syncResult.success) {
        return reply.status(400).send({ 
          error: 'Reconciliation pre-validation failed', 
          reason: syncResult.failureReason 
        });
      }

      // 3. PostgreSQL Lock & Post-Lock Revalidation & Shared Completion
      try {
        const result = await opts.auctionService.completeSettlement(
          settlement.auctionId,
          settlement.settlementId,
          settlement.winnerId,
          auction.currentPricePaise.toString(),
          'ADMIN_RECONCILIATION',
          draftOrderId
        );

        if (result.alreadyProcessed) {
          return reply.status(200).send({ ok: true, message: 'Already processed during lock' });
        }

        return reply.status(200).send({ ok: true, events: result.events });
      } catch (atomicError: any) {
        logger.error(atomicError, 'Atomic reconciliation completion failed');
        // If post-lock validation failed (e.g. Winner ID mismatch or Amount changed locally)
        return reply.status(409).send({ error: atomicError.message });
      }

    } catch (err: any) {
      logger.error(err, 'Unhandled error in settlement reconciliation route');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}
