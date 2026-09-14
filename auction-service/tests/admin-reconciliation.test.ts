import { describe, it, expect, vi, beforeEach } from 'vitest';
import fastify from 'fastify';

describe('Admin Reconciliation Route Tests', () => {
  let app: any;
  let mockSettlementService: any;
  let mockAuctionService: any;
  let mockPaymentGateway: any;
  let authMiddlewareMock = vi.fn((req: any, reply: any, done: any) => done());
  let auditMiddlewareMock = vi.fn((req: any, reply: any, done: any) => done());
  let authorizeMiddlewareMock = vi.fn((req: any, reply: any, done: any) => done());
  let idempotencyMiddlewareMock = vi.fn((req: any, reply: any, done: any) => done());

  beforeEach(async () => {
    vi.resetModules();
    vi.doMock('../src/modules/auth/middleware/authenticate', () => ({ authenticateIdentity: authMiddlewareMock }));
    vi.doMock('../src/modules/auth/middleware/authorize', () => ({ canManageAuction: authorizeMiddlewareMock }));
    vi.doMock('../src/api/middleware/AuditMiddleware', () => ({ auditContextMiddleware: auditMiddlewareMock }));
    vi.doMock('../src/api/middleware/IdempotencyMiddleware', () => ({ requireIdempotency: idempotencyMiddlewareMock }));

    const { default: createReconciliationRoutes } = await import('../src/api/routes/admin/reconciliation');
    const { setupZodValidator } = await import('../src/api/plugins/fastify-zod');

    mockSettlementService = {
      getSettlement: vi.fn()
    };

    mockAuctionService = {
      getAuction: vi.fn(),
      completeSettlement: vi.fn()
    };

    mockPaymentGateway = {
      syncSettlementOrder: vi.fn()
    };

    app = fastify();
    setupZodValidator(app);
    
    // We need custom JSON parser to match how standard fastify parses bodies, but our route is POST so it's fine.
    await createReconciliationRoutes(app, {
      settlementService: mockSettlementService,
      auctionService: mockAuctionService,
      paymentGateway: mockPaymentGateway,
    } as any);
  });

  const validHeaders = {
    'x-request-id': '123e4567-e89b-12d3-a456-426614174000',
    'x-correlation-id': '123e4567-e89b-12d3-a456-426614174000',
    'idempotency-key': '123e4567-e89b-12d3-a456-426614174000'
  };

  it('fails if settlement not found', async () => {
    mockSettlementService.getSettlement.mockResolvedValue(null);
    const res = await app.inject({
      method: 'POST',
      url: '/settlements/s-1/sync',
      headers: validHeaders
    });
    expect(res.statusCode).toBe(404);
  });

  it('fails if Draft Order is not converted (syncSettlementOrder fails)', async () => {
    mockSettlementService.getSettlement.mockResolvedValue({
      settlementId: 's-1',
      auctionId: 'a-1',
      winnerId: 'w-1',
      settlementStatus: 'PENDING',
      providerReference: { provider: 'shopify', providerPaymentId: 'draft-1' }
    });
    mockAuctionService.getAuction.mockResolvedValue({ currentPricePaise: 1000 });
    mockPaymentGateway.syncSettlementOrder.mockResolvedValue({ success: false, failureReason: 'Draft Order has not been converted to an Order (not paid).' });

    const res = await app.inject({
      method: 'POST',
      url: '/settlements/s-1/sync',
      headers: validHeaders
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().reason).toBe('Draft Order has not been converted to an Order (not paid).');
  });

  it('fails if amount mismatch (syncSettlementOrder fails)', async () => {
    mockSettlementService.getSettlement.mockResolvedValue({
      settlementId: 's-1',
      auctionId: 'a-1',
      winnerId: 'w-1',
      settlementStatus: 'PENDING',
      providerReference: { provider: 'shopify', providerPaymentId: 'draft-1' }
    });
    mockAuctionService.getAuction.mockResolvedValue({ currentPricePaise: 1000 });
    mockPaymentGateway.syncSettlementOrder.mockResolvedValue({ success: false, failureReason: 'Amount mismatch' });

    const res = await app.inject({
      method: 'POST',
      url: '/settlements/s-1/sync',
      headers: validHeaders
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns ok if already COMPLETED', async () => {
    mockSettlementService.getSettlement.mockResolvedValue({
      settlementStatus: 'COMPLETED'
    });
    const res = await app.inject({
      method: 'POST',
      url: '/settlements/s-1/sync',
      headers: validHeaders
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().message).toBe('Already processed');
  });

  it('completes settlement if valid', async () => {
    mockSettlementService.getSettlement.mockResolvedValue({
      settlementId: 's-1',
      auctionId: 'a-1',
      winnerId: 'w-1',
      settlementStatus: 'PENDING',
      providerReference: { provider: 'shopify', providerPaymentId: 'draft-1' }
    });
    mockAuctionService.getAuction.mockResolvedValue({ currentPricePaise: 1000 });
    mockPaymentGateway.syncSettlementOrder.mockResolvedValue({ success: true, orderId: 'ord-1' });
    
    mockAuctionService.completeSettlement.mockResolvedValue({ alreadyProcessed: false, events: [{ type: 'foo' }] });

    const res = await app.inject({
      method: 'POST',
      url: '/settlements/s-1/sync',
      headers: validHeaders
    });
    expect(res.statusCode).toBe(200);
    expect(mockAuctionService.completeSettlement).toHaveBeenCalledWith(
      'a-1', 's-1', 'w-1', '1000', 'ADMIN_RECONCILIATION', 'draft-1'
    );
  });

  it('handles post-lock revalidation failures from completeSettlement', async () => {
    mockSettlementService.getSettlement.mockResolvedValue({
      settlementId: 's-1',
      auctionId: 'a-1',
      winnerId: 'w-1',
      settlementStatus: 'PENDING',
      providerReference: { provider: 'shopify', providerPaymentId: 'draft-1' }
    });
    mockAuctionService.getAuction.mockResolvedValue({ currentPricePaise: 1000 });
    mockPaymentGateway.syncSettlementOrder.mockResolvedValue({ success: true, orderId: 'ord-1' });
    
    mockAuctionService.completeSettlement.mockRejectedValue(new Error('Post-lock revalidation failed: Winner ID mismatch'));

    const res = await app.inject({
      method: 'POST',
      url: '/settlements/s-1/sync',
      headers: validHeaders
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toContain('Winner ID mismatch');
  });
});
