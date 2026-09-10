import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { ShopifyConfig } from '../../../infrastructure/config/ShopifyConfig';
import { logger } from '../../../shared/logger';
import { ApiDependencies } from '../index';

export default async function shopifyWebhookRoutes(app: FastifyInstance, opts: ApiDependencies) {
  
  // Custom content parser to capture raw body bytes for HMAC verification
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, function (req, body, done) {
    try {
      // If running in Firebase Functions, req.rawBody might already exist on the IncomingMessage.
      // Otherwise, we capture it here from the Fastify pipeline.
      const rawBodyBuffer = (req as any).rawBody || body;
      (req as any).rawBodyBuffer = rawBodyBuffer;
      const json = JSON.parse(body.toString());
      done(null, json);
    } catch (err: any) {
      err.statusCode = 400;
      done(err, undefined);
    }
  });

  app.post('/shopify', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const hmacHeader = req.headers['x-shopify-hmac-sha256'] as string;
      if (!hmacHeader) {
        return reply.status(401).send({ error: 'Missing HMAC signature' });
      }

      const rawBody = (req.raw as any).rawBody || (req.raw as any).rawBodyBuffer || (req as any).rawBodyBuffer;
      
      if (!rawBody) {
        logger.error('Failed to capture raw body for Shopify webhook');
        return reply.status(500).send({ error: 'Internal Server Error' });
      }

      const hash = crypto.createHmac('sha256', ShopifyConfig.webhookSecret)
                         .update(rawBody)
                         .digest('base64');
      const hashBuffer = Buffer.from(hash);
      const headerBuffer = Buffer.from(hmacHeader);
      
      if (hashBuffer.length !== headerBuffer.length || !crypto.timingSafeEqual(headerBuffer, hashBuffer)) {
        logger.warn('Shopify webhook signature mismatch');
        return reply.status(401).send({ error: 'Invalid HMAC signature' });
      }

      const payload = req.body as any;

      if (payload.financial_status !== 'paid') {
        logger.info({ orderId: payload.id }, 'Ignoring Shopify webhook: financial_status is not paid');
        return reply.status(200).send({ ok: true });
      }

      const attrs = payload.note_attributes || [];
      const getA = (name: string) => (attrs.find((a: any) => a.name === name) || {}).value;

      const settlementId = getA('_settlement_id');
      const auctionId = getA('_auction_id');
      const winnerId = getA('_winner_id');

      if (!settlementId || !auctionId) {
        logger.info({ orderId: payload.id }, 'Ignoring Shopify webhook: missing _settlement_id or _auction_id');
        return reply.status(200).send({ ok: true });
      }

      // Check Idempotency Store (fast check)
      const isDuplicate = await opts.webhookIdempotencyStore.checkIfExists('shopify', String(payload.id));
      if (isDuplicate) {
        logger.info({ orderId: payload.id }, 'Shopify webhook already processed (IdempotencyStore)');
        return reply.status(200).send({ ok: true });
      }

      // Authoritative Data Fetch
      const settlement = await opts.settlementService.getSettlement(settlementId);
      if (!settlement) {
        logger.warn({ settlementId }, 'Shopify webhook: Settlement not found');
        return reply.status(200).send({ ok: true });
      }

      if (settlement.settlementStatus === 'COMPLETED') {
        logger.info({ settlementId }, 'Shopify webhook: Settlement already completed');
        return reply.status(200).send({ ok: true });
      }

      if (settlement.auctionId !== auctionId) {
        logger.warn({ settlementId, payloadAuctionId: auctionId }, 'Shopify webhook: Auction ID mismatch');
        return reply.status(200).send({ ok: true });
      }

      // Customer Match Verification
      const customerId = payload.customer?.id ? String(payload.customer.id) : null;
      // Note: In a real system, you map Shopify customer IDs to LEGXI user IDs. 
      // We will strictly ensure the settlement's winnerId matches the expected user.
      // Since Shopify doesn't natively send our internal userId except via note_attributes, 
      // we compare the note_attributes _winner_id against the settlement.winnerId
      // and ensure the payload actually contains it.
      if (winnerId !== settlement.winnerId) {
        logger.warn({ settlementId, payloadWinnerId: winnerId }, 'Shopify webhook: Winner ID mismatch');
        return reply.status(200).send({ ok: true });
      }

      // Exact Amount Verification
      const auction = await opts.auctionService.getAuction(auctionId);
      if (!auction) {
        logger.warn({ auctionId }, 'Shopify webhook: Auction not found');
        return reply.status(200).send({ ok: true });
      }

      const expectedPrice = (Number(auction.currentPricePaise) / 100).toFixed(2);
      if (parseFloat(payload.total_price) !== parseFloat(expectedPrice)) {
        logger.warn({ expectedPrice, actualPrice: payload.total_price }, 'Shopify webhook: Exact amount mismatch');
        return reply.status(200).send({ ok: true });
      }

      // Currency Verification
      if (payload.currency !== 'INR') { // Assuming INR, adjust if needed
        logger.warn({ currency: payload.currency }, 'Shopify webhook: Currency mismatch');
        return reply.status(200).send({ ok: true });
      }

      // Atomic Execution
      try {
        const result = await (opts.auctionService as any).processSettlementWebhook(auctionId, String(payload.id), payload);
        if (result.alreadyProcessed) {
           return reply.status(200).send({ ok: true, message: 'Already processed' });
        }
        return reply.status(200).send({ ok: true });
      } catch (atomicError: any) {
        logger.error(atomicError, 'Atomic settlement transition failed');
        // Transient DB error / Optimistic lock failure -> 500 so Shopify retries
        return reply.status(500).send({ error: 'Transient error during settlement' });
      }

    } catch (err: any) {
      logger.error(err, 'Unhandled error in Shopify webhook');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}
