import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ISettlementService } from '../../services/ISettlementService';
import { IPaymentGateway } from '../../../application/ports/IPaymentGateway';
import { WebhookIdempotencyStore, WebhookEventRecord } from '../../../infrastructure/adapters/WebhookIdempotencyStore';
import { createHash } from 'crypto';

interface RazorpayWebhookRouteOpts {
  settlementService: ISettlementService;
  paymentGateway: IPaymentGateway;
  webhookIdempotencyStore: WebhookIdempotencyStore;
}

export default async function (fastify: FastifyInstance, opts: RazorpayWebhookRouteOpts) {
  fastify.post('/razorpay', async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['x-razorpay-signature'] as string;
    
    // We must capture the exact raw body string for HMAC validation
    // Assume fastify raw body parsing is configured, or we stringify the JSON
    // for this example. In a real environment, `request.rawBody` should be used.
    const rawPayload = JSON.stringify(request.body);
    const rawPayloadHash = createHash('sha256').update(rawPayload).digest('hex');

    const providerEventId = (request.body as any)?.id || 'unknown';
    const auctionId = (request.body as any)?.payload?.payment?.entity?.notes?.auction_id;
    const providerPaymentId = (request.body as any)?.payload?.payment?.entity?.id;

    // 1. Check Missing Signature
    if (!signature) {
      request.log.error('Missing x-razorpay-signature header');
      await recordEventAndReturn(opts.webhookIdempotencyStore, reply, {
        provider: 'razorpay',
        providerEventId,
        providerPaymentId,
        auctionId,
        signatureVerified: false,
        processingResult: 'SIGNATURE_MISSING',
        correlationId: (request as any).correlationId,
        requestId: request.id,
        rawPayloadHash
      }, 400); // Bad Request because the request itself is malformed
      return;
    }

    // 2. Signature Validation via Gateway Adapter
    const gatewayResult = await opts.paymentGateway.verifyPayment(request.body, signature);

    if (!gatewayResult.success && gatewayResult.failureReason?.includes('signature')) {
      request.log.error({ reason: gatewayResult.failureReason }, 'Razorpay signature validation failed');
      await recordEventAndReturn(opts.webhookIdempotencyStore, reply, {
        provider: 'razorpay',
        providerEventId,
        providerPaymentId,
        auctionId,
        signatureVerified: false,
        processingResult: 'SIGNATURE_INVALID',
        correlationId: (request as any).correlationId,
        requestId: request.id,
        rawPayloadHash
      }, 400); 
      return;
    }

    // 3. Replay Protection (Idempotency Store)
    const isNew = await opts.webhookIdempotencyStore.recordEvent({
      provider: 'razorpay',
      providerEventId,
      providerPaymentId,
      auctionId,
      signatureVerified: true,
      processingResult: 'PROCESSING_STARTED',
      correlationId: (request as any).correlationId,
      requestId: request.id,
      rawPayloadHash
    });

    if (!isNew) {
      // It's a duplicate. We return 200 OK to tell Razorpay to stop retrying.
      return reply.status(200).send({ status: 'ok', message: 'Duplicate event ignored' });
    }

    // 4. Unknown Target Protection
    if (!auctionId) {
      request.log.warn({ providerEventId }, 'Webhook received without auction_id in notes');
      // Must return 200 OK to prevent gateway retry loops on unknown webhooks
      return reply.status(200).send({ status: 'ok', message: 'UNKNOWN_TARGET' });
    }

    // 5. Business Logic (Settlement Service)
    try {
      await opts.settlementService.processPaymentWebhook(auctionId, request.body, gatewayResult);
      request.log.info({ auctionId, providerEventId }, 'Razorpay webhook processed successfully');
      return reply.status(200).send({ status: 'ok' });
    } catch (error: any) {
      request.log.error({ err: error, auctionId, providerEventId }, 'Error processing Razorpay webhook');
      // If it's a domain/app error (like OCC Exhaustion), we return 500 so Razorpay retries
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}

async function recordEventAndReturn(store: WebhookIdempotencyStore, reply: FastifyReply, event: WebhookEventRecord, statusCode: number) {
  try {
    await store.recordEvent(event);
  } catch (e) {
    // Ignore idempotency write errors during failure recording
  }
  return reply.status(statusCode).send({ error: event.processingResult });
}
