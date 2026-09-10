import { FastifyInstance } from 'fastify';
import auctionRoutes from './auction.routes';
import bidRoutes from './bid.routes';
import adminRoutes from './admin.routes';
import healthRoutes from './health.routes';
import { IAuctionService } from '../services/IAuctionService';
import { IBidService } from '../services/IBidService';
import { IAdminService } from '../services/IAdminService';
import { IHealthService } from '../services/IHealthService';
import { ISettlementService } from '../services/ISettlementService';
import { IEventPublisher } from '../../application/ports/IEventPublisher';
import { IPaymentGateway } from '../../application/ports/IPaymentGateway';
import { WebhookIdempotencyStore } from '../../infrastructure/adapters/WebhookIdempotencyStore';
import { setupZodValidator } from '../plugins/fastify-zod';

export interface ApiDependencies {
  auctionService: IAuctionService;
  bidService: IBidService;
  adminService: IAdminService;
  healthService: IHealthService;
  settlementService: ISettlementService;
  eventPublisher: IEventPublisher;
  paymentGateway: IPaymentGateway;
  webhookIdempotencyStore: WebhookIdempotencyStore;
  redisClient: import('ioredis').default;
}

export default async function apiRoutes(app: FastifyInstance, opts: ApiDependencies) {
  setupZodValidator(app);

  app.register(healthRoutes, { prefix: '/health', healthService: opts.healthService });
  app.register(auctionRoutes, { 
    prefix: '/auctions', 
    auctionService: opts.auctionService,
    bidService: opts.bidService,
    redisClient: opts.redisClient
  });
  app.register(adminRoutes, { prefix: '/admin', adminService: opts.adminService });
  app.register(bidRoutes, { bidService: opts.bidService }); // mounts /bids and /auctions/:id/bids
  
  // Phase 3 Webhooks
  app.register(async (instance) => {
    const shopifyWebhookRoutes = (await import('./webhooks/shopify')).default;
    await shopifyWebhookRoutes(instance, opts);
  }, { prefix: '/webhooks' });
}
