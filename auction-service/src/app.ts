import fastify from 'fastify';
import { randomUUID } from 'crypto';
import { logger } from './shared/logger';
import { errorHandler } from './shared/middleware/errorHandler';
import apiRoutes from './api/routes';
import { IAuctionService } from './api/services/IAuctionService';
import { IBidService } from './api/services/IBidService';
import { IAdminService } from './api/services/IAdminService';
import { IHealthService } from './api/services/IHealthService';
import { HealthService } from './infrastructure/services/HealthService';
import { AuctionService } from './application/services/AuctionService';
import { BidService } from './application/services/BidService';
import { AdminService } from './application/services/AdminService';
import { SettlementService } from './application/services/SettlementService';
import { AuctionRepositoryAdapter } from './infrastructure/adapters/AuctionRepositoryAdapter';
import { BidRepositoryAdapter } from './infrastructure/adapters/BidRepositoryAdapter';
import { BidTransactionRepositoryAdapter } from './infrastructure/adapters/BidTransactionRepositoryAdapter';
import { AuctionTransactionRepositoryAdapter } from './infrastructure/adapters/AuctionTransactionRepositoryAdapter';
import { AuctionLifecycleTransactionRepositoryAdapter } from './infrastructure/adapters/AuctionLifecycleTransactionRepositoryAdapter';
import { NoOpEventPublisher } from './infrastructure/adapters/NoOpEventPublisher';
import { SystemTimeProvider } from './infrastructure/adapters/SystemTimeProvider';
import { AuctionRepository } from './database/repositories/auction.repository';
import { BidRepository } from './database/repositories/bid.repository';
import { RetryExecutor } from './application/utils/RetryExecutor';
import { NoOpPaymentGateway } from './infrastructure/adapters/NoOpPaymentGateway';
import { RazorpayPaymentGateway } from './infrastructure/adapters/RazorpayPaymentGateway';
import { WebhookIdempotencyStore } from './infrastructure/adapters/WebhookIdempotencyStore';

// Domain Imports
import { 
  AuctionEngine, 
  IncrementPolicy, 
  AuctionStatePolicy,
  ReservePricePolicy, 
  BidValidationPolicy,
  AuctionExtensionPolicy,
  AuctionClosingPolicy,
  WinnerDeterminationPolicy,
  PaymentConfig,
  AntiSnipingConfig
} from './domain';

// Initialize Repositories (Prisma abstractions)
const dbAuctionRepo = new AuctionRepository();
const dbBidRepo = new BidRepository();

// Initialize Infrastructure Adapters (Ports)
const auctionRepoAdapter = new AuctionRepositoryAdapter(dbAuctionRepo);
const bidRepoAdapter = new BidRepositoryAdapter(dbBidRepo);
const bidTxRepoAdapter = new BidTransactionRepositoryAdapter();
const auctionTxRepoAdapter = new AuctionTransactionRepositoryAdapter();
const auctionLifecycleTxRepoAdapter = new AuctionLifecycleTransactionRepositoryAdapter();
const webhookIdempotencyStore = new WebhookIdempotencyStore();
import { SettlementRepositoryAdapter } from './infrastructure/adapters/SettlementRepositoryAdapter';
const settlementRepoAdapter = new SettlementRepositoryAdapter();

// Use Razorpay in production, NoOp for tests based on ENV. Hardcoded to NoOp here for safety unless Razorpay config is present.
// If implementing fully, we'd inject this from config module.
const razorpayConfig = {
  keyId: process.env.RAZORPAY_KEY_ID || 'test_key',
  keySecret: process.env.RAZORPAY_KEY_SECRET || 'test_secret',
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret'
};
const paymentGatewayAdapter = process.env.NODE_ENV === 'production' 
  ? new RazorpayPaymentGateway(razorpayConfig) 
  : new NoOpPaymentGateway();

const eventPublisher = new NoOpEventPublisher();
const timeProvider = new SystemTimeProvider();
const retryExecutor = new RetryExecutor();

declare module 'fastify' {
  interface FastifyInstance {
    io: import('socket.io').Server;
  }
}

// Initialize Domain Policies & Engine
const incrementPolicy = new IncrementPolicy();
const bidValidationPolicy = new BidValidationPolicy();
const auctionStatePolicy = new AuctionStatePolicy();
const reservePricePolicy = new ReservePricePolicy();
const auctionExtensionPolicy = new AuctionExtensionPolicy();
const auctionClosingPolicy = new AuctionClosingPolicy();
const winnerDeterminationPolicy = new WinnerDeterminationPolicy();

const antiSnipingConfig: AntiSnipingConfig = {
  triggerWindowMs: 2 * 60 * 1000, // 2 minutes
  extensionDurationMs: 2 * 60 * 1000, // 2 minutes
  maxExtensions: 3 // Max 3 extensions
};

const paymentConfig: PaymentConfig = {
  paymentWindowMs: 24 * 60 * 60 * 1000 // 24 hours
};

const auctionEngine = new AuctionEngine(
  incrementPolicy,
  bidValidationPolicy,
  auctionStatePolicy,
  reservePricePolicy,
  auctionExtensionPolicy,
  auctionClosingPolicy,
  winnerDeterminationPolicy
);

// DI Container placeholders (Now actual services)
const diContainer = {
  auctionService: new AuctionService(
    auctionRepoAdapter,
    bidRepoAdapter,
    auctionTxRepoAdapter,
    auctionLifecycleTxRepoAdapter,
    eventPublisher,
    timeProvider,
    auctionEngine,
    retryExecutor
  ),
  bidService: new BidService(
    bidRepoAdapter, 
    auctionRepoAdapter, 
    bidTxRepoAdapter, 
    eventPublisher, 
    timeProvider, 
    auctionEngine, 
    retryExecutor,
    antiSnipingConfig
  ),
  settlementService: new SettlementService(
    settlementRepoAdapter,
    eventPublisher
  ),
  adminService: new AdminService(auctionRepoAdapter, eventPublisher, timeProvider),
  healthService: new HealthService(),
};

// Initialize Process Managers
import { SettlementProcessManager } from './application/services/SettlementProcessManager';
const settlementProcessManager = new SettlementProcessManager(diContainer.settlementService);
// eventPublisher.subscribe('AuctionClosedWithWinner', settlementProcessManager.onAuctionClosedWithWinner.bind(settlementProcessManager));

import { HttpTransferServiceAdapter } from './infrastructure/adapters/transfer/HttpTransferServiceAdapter';
import { CertificateTransferProcessManager } from './application/services/CertificateTransferProcessManager';
import { TransferRequestFactory } from './application/services/TransferRequestFactory';
import { MockUserService } from './infrastructure/adapters/MockUserService';

const transferServiceAdapter = new HttpTransferServiceAdapter({
  baseUrl: process.env.TRANSFER_SERVICE_URL || 'http://localhost:4000',
  authToken: process.env.TRANSFER_SERVICE_TOKEN || 'dev-token',
  timeoutMs: parseInt(process.env.TRANSFER_SERVICE_TIMEOUT_MS || '5000', 10)
});

const mockUserService = new MockUserService();
const transferRequestFactory = new TransferRequestFactory(auctionRepoAdapter, mockUserService);

const certificateTransferProcessManager = new CertificateTransferProcessManager(
  transferServiceAdapter,
  eventPublisher,
  transferRequestFactory
);
import { AdminOperationalQueries } from './infrastructure/queries/AdminOperationalQueries';
import { AdminRetryService } from './application/services/admin/AdminRetryService';
import { AdminStatusQueryService } from './application/services/admin/AdminStatusQueryService';
import { AdminTimelineQueryService } from './application/services/admin/AdminTimelineQueryService';
import { OperationalTimelineAssembler } from './application/services/admin/OperationalTimelineAssembler';
import { AdminOperationsFacade } from './application/services/admin/AdminOperationsFacade';
import { AnalyticsQueries } from './infrastructure/queries/AnalyticsQueries';
import { AnalyticsQueryService } from './application/services/analytics/AnalyticsQueryService';
import { AnalyticsReportAssembler } from './application/services/analytics/AnalyticsReportAssembler';
import { RevenueCalculator } from './application/services/analytics/calculators/RevenueCalculator';
import { AuctionPerformanceCalculator } from './application/services/analytics/calculators/AuctionPerformanceCalculator';
import { OperationsKpiCalculator } from './application/services/analytics/calculators/OperationsKpiCalculator';
import { createAnalyticsRouter } from './api/routes/admin/analytics';
import { createAdminOperationsRouter } from './api/routes/admin/operations';
import { prisma } from './database';

// Phase 2.20 wiring
const adminOperationalQueries = new AdminOperationalQueries(prisma);
const timelineAssembler = new OperationalTimelineAssembler();

const adminRetryService = new AdminRetryService(
  certificateTransferProcessManager, 
  adminOperationalQueries,
  { retry: async (id: string) => logger.info({ id }, 'Mock notification engine retry') } // Mock Notification Engine
);

const adminStatusQueryService = new AdminStatusQueryService(adminOperationalQueries);
const adminTimelineQueryService = new AdminTimelineQueryService(timelineAssembler, prisma);

const adminOperationsFacade = new AdminOperationsFacade(
  adminRetryService,
  adminStatusQueryService,
  adminTimelineQueryService
);

// Phase 2.21 wiring
const analyticsQueries = new AnalyticsQueries(prisma);
const analyticsReportAssembler = new AnalyticsReportAssembler();
const revenueCalculator = new RevenueCalculator();
const auctionPerformanceCalculator = new AuctionPerformanceCalculator();
const operationsKpiCalculator = new OperationsKpiCalculator();

const analyticsQueryService = new AnalyticsQueryService(
  analyticsQueries,
  analyticsReportAssembler,
  revenueCalculator,
  auctionPerformanceCalculator,
  operationsKpiCalculator
);

// Phase 2.22 wiring
import { Tracer } from './infrastructure/telemetry/Tracer';
import { MetricsStore } from './infrastructure/telemetry/MetricsStore';
import { createHealthRouter } from './api/routes/health';
import { createMetricsRouter } from './api/routes/metrics';

const tracer = new Tracer();
tracer.init(); // Optional init

const metricsStore = new MetricsStore();
const originalEventPublisher = eventPublisher;
const telemetryEventPublisher = {
  publish: async (topic: string, payload: any) => {
    metricsStore.processEvent(topic);
    return originalEventPublisher.publish(topic, payload);
  }
};

// eventPublisher.subscribe('SettlementCompleted', certificateTransferProcessManager.onSettlementCompleted.bind(certificateTransferProcessManager));

import { setupWebSocket } from './ws/setup';
import { authRoutes } from './modules/auth/auth.routes';

export function buildApp() {
  const app = fastify({
    logger: false, // We use custom Pino logger middleware
    genReqId: (req) => {
      const existingId = req.headers['x-request-id'];
      return typeof existingId === 'string' ? existingId : randomUUID();
    },
  });

  // Request/Response logging middleware
  app.addHook('onRequest', (request, reply, done) => {
    const correlationHeader = request.headers['x-correlation-id'];
    const correlationId = Array.isArray(correlationHeader) ? correlationHeader[0] : (correlationHeader || request.id);
    reply.header('x-correlation-id', correlationId);
    const traceHeader = request.headers['x-trace-id'];
    const traceId = Array.isArray(traceHeader) ? traceHeader[0] : (traceHeader || randomUUID());
    
    const traceHeaders = tracer.extractTraceHeaders(request.headers);

    const reqCustom = request as unknown as { correlationId: string; traceId: string; traceparent?: string };
    reqCustom.correlationId = correlationId;
    reqCustom.traceId = traceId;
    if (traceHeaders.traceparent) reqCustom.traceparent = traceHeaders.traceparent;
    
    request.log = logger.child({ 
      reqId: request.id, 
      correlationId, 
      traceId,
      traceparent: traceHeaders.traceparent,
      baggage: traceHeaders.baggage
    });

    request.log.info({ method: request.method, url: request.url }, 'Incoming request');
    done();
  });

  app.addHook('onResponse', (request, reply, done) => {
    request.log.info({ 
      method: request.method, 
      url: request.url, 
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime
    }, 'Request completed');
    done();
  });

  app.setErrorHandler(errorHandler);

  // Register API v1 Routes
  app.register(apiRoutes, { 
    prefix: '/api/v1',
    auctionService: diContainer.auctionService,
    bidService: diContainer.bidService,
    adminService: diContainer.adminService,
    healthService: diContainer.healthService,
    settlementService: diContainer.settlementService,
    paymentGateway: paymentGatewayAdapter,
    webhookIdempotencyStore: webhookIdempotencyStore
  });

  app.register(authRoutes, { prefix: '/api/v1/auth' });

  app.register(createAdminOperationsRouter(adminOperationsFacade), { prefix: '/api/v1/admin' });
  app.register(createAnalyticsRouter(analyticsQueryService), { prefix: '/api/v1/admin/analytics' });
  
  // Phase 2.22 Routes
  app.register(createHealthRouter(prisma), { prefix: '/health' });
  app.register(createMetricsRouter(metricsStore));

  // Attach WebSocket Transport Layer
  const io = setupWebSocket(app.server, {
    auctionService: diContainer.auctionService,
    bidService: diContainer.bidService,
    adminService: diContainer.adminService
  });
  
  // Store io on fastify app for graceful shutdown
  app.decorate('io', io);

  return app;
}
