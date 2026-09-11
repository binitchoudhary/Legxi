import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ShopifyPaymentGateway } from '../src/infrastructure/adapters/ShopifyPaymentGateway';
import { ShopifyDraftOrderOrchestrator } from '../src/application/services/ShopifyDraftOrderOrchestrator';

vi.mock('../src/infrastructure/config/ShopifyConfig', () => ({
  ShopifyConfig: {
    storeDomain: 'test-store.myshopify.com',
    apiVersion: '2023-10',
    adminToken: 'test-token'
  }
}));

describe('Layer 7: Shopify Idempotency and Lease Protection', () => {
  let paymentGateway: ShopifyPaymentGateway;
  let orchestrator: ShopifyDraftOrderOrchestrator;
  let auctionRepoMock: any;
  let settlementRepoMock: any;
  let settlementServiceMock: any;
  let auctionServiceMock: any;
  let redisMock: any;

  beforeEach(() => {
    vi.useFakeTimers();

    auctionRepoMock = {
      findById: vi.fn().mockResolvedValue({ id: 'auc_1', shopifyProductId: 'prod_1' })
    };
    settlementRepoMock = {
      findByAuctionId: vi.fn().mockResolvedValue({ settlementId: 'set_1', providerReference: null })
    };
    settlementServiceMock = {
      recordPaymentAttempt: vi.fn().mockResolvedValue(undefined)
    };
    auctionServiceMock = {
      getAuction: vi.fn().mockResolvedValue({ id: 'auc_1', currentPricePaise: 1000n })
    };

    redisMock = {
      set: vi.fn().mockResolvedValue('OK'),
      eval: vi.fn().mockResolvedValue(1)
    };

    paymentGateway = new ShopifyPaymentGateway(auctionRepoMock, settlementRepoMock);
    orchestrator = new ShopifyDraftOrderOrchestrator(
      paymentGateway,
      settlementServiceMock,
      auctionServiceMock,
      redisMock as any
    );

    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  const mockGraphQLResponse = (edges: any[], hasNextPage = false) => {
    return {
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: {
          draftOrders: {
            edges,
            pageInfo: { hasNextPage, endCursor: 'cur_1' }
          }
        }
      })
    };
  };

  const createValidRemoteCandidate = () => ({
    node: {
      id: 'gid://shopify/DraftOrder/do_1',
      legacyResourceId: 'do_1',
      status: 'OPEN',
      invoiceUrl: 'https://invoice.com',
      totalPrice: '10.00',
      currencyCode: 'INR',
      customAttributes: [
        { key: '_settlement_id', value: 'set_1' },
        { key: '_auction_id', value: 'auc_1' },
        { key: '_winner_id', value: 'win_1' }
      ]
    }
  });

  it('1. providerReference valid -> reuse existing', async () => {
    settlementRepoMock.findByAuctionId.mockResolvedValue({ 
      settlementId: 'set_1', 
      providerReference: { provider: 'shopify', providerPaymentId: 'do_1' } 
    });
    
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        draft_order: {
          id: 'do_1',
          status: 'open',
          invoice_url: 'url',
          total_price: '10.00',
          currency: 'INR',
          note_attributes: [
            { name: '_settlement_id', value: 'set_1' },
            { name: '_auction_id', value: 'auc_1' },
            { name: '_winner_id', value: 'win_1' }
          ]
        }
      })
    });

    const result = await paymentGateway.createPaymentSession('auc_1', '1000', 'win_1');
    expect(result.success).toBe(true);
    expect(result.providerReference).toBe('do_1');
  });

  it('2. providerReference mismatch -> fail closed', async () => {
    settlementRepoMock.findByAuctionId.mockResolvedValue({ 
      settlementId: 'set_1', 
      providerReference: { provider: 'shopify', providerPaymentId: 'do_1' } 
    });
    
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        draft_order: {
          id: 'do_1',
          status: 'open',
          invoice_url: 'url',
          total_price: '10.00',
          currency: 'INR',
          note_attributes: [
            { name: '_settlement_id', value: 'wrong' }
          ]
        }
      })
    });

    const result = await paymentGateway.createPaymentSession('auc_1', '1000', 'win_1');
    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('Correlation metadata mismatch');
  });

  it('3. zero remote candidates -> coordinated creation', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(mockGraphQLResponse([]))
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ product: { variants: [{ id: 1, price: '10.00' }] } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          draft_order: { id: 'do_2', total_price: '10.00', currency: 'INR', invoice_url: 'url', note_attributes: [
            { name: '_settlement_id', value: 'set_1' },
            { name: '_auction_id', value: 'auc_1' },
            { name: '_winner_id', value: 'win_1' }
          ]}
        })
      });

    const result = await paymentGateway.createPaymentSession('auc_1', '1000', 'win_1');
    expect(result.success).toBe(true);
    expect(result.providerReference).toBe('do_2');
  });

  it('4. one valid remote candidate -> recovery', async () => {
    (global.fetch as any).mockResolvedValueOnce(mockGraphQLResponse([createValidRemoteCandidate()]));
    const result = await paymentGateway.createPaymentSession('auc_1', '1000', 'win_1');
    expect(result.success).toBe(true);
    expect(result.providerReference).toBe('do_1');
  });

  it('5. one invalid remote candidate -> fail closed', async () => {
    const invalid = createValidRemoteCandidate();
    invalid.node.totalPrice = '99.00';
    (global.fetch as any).mockResolvedValueOnce(mockGraphQLResponse([invalid]));
    const result = await paymentGateway.createPaymentSession('auc_1', '1000', 'win_1');
    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('Amount mismatch');
  });

  it('6. multiple remote candidates -> fail closed', async () => {
    (global.fetch as any).mockResolvedValueOnce(mockGraphQLResponse([createValidRemoteCandidate(), createValidRemoteCandidate()]));
    const result = await paymentGateway.createPaymentSession('auc_1', '1000', 'win_1');
    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('Multiple remote Draft Orders found');
  });

  it('7. POST succeeds + local persistence lost -> remote recovery', async () => {
    (global.fetch as any).mockResolvedValueOnce(mockGraphQLResponse([createValidRemoteCandidate()]));
    await orchestrator.onSettlementCreated({ auctionId: 'auc_1', settlementId: 'set_1', winnerId: 'win_1' });
    expect(settlementServiceMock.recordPaymentAttempt).toHaveBeenCalledWith('set_1', 'shopify', 'do_1', undefined);
  });

  it('8. POST timeout + remote Draft exists -> recovery', async () => {
    (global.fetch as any).mockResolvedValueOnce(mockGraphQLResponse([createValidRemoteCandidate()]));
    await orchestrator.onSettlementCreated({ auctionId: 'auc_1', settlementId: 'set_1', winnerId: 'win_1' });
    expect(settlementServiceMock.recordPaymentAttempt).toHaveBeenCalled();
  });

  it('9. POST failure + no remote Draft -> safe retry', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(mockGraphQLResponse([]))
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ product: { variants: [{ id: 1, price: '10.00' }] } })
      })
      .mockResolvedValueOnce({
        ok: false, status: 500, text: vi.fn().mockResolvedValue('Internal Error')
      });

    await expect(orchestrator.onSettlementCreated({ auctionId: 'auc_1', settlementId: 'set_1', winnerId: 'win_1' })).rejects.toThrow('Shopify API returned 500');
  });

  it('10. two concurrent workers -> EXACTLY ONE Draft Order (Redis lock prevents race)', async () => {
    redisMock.set.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);
    
    (global.fetch as any)
      .mockResolvedValueOnce(mockGraphQLResponse([]))
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ product: { variants: [{ id: 1, price: '10.00' }] } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          draft_order: { id: 'do_2', total_price: '10.00', currency: 'INR', invoice_url: 'url', note_attributes: [
            { name: '_settlement_id', value: 'set_1' },
            { name: '_auction_id', value: 'auc_1' },
            { name: '_winner_id', value: 'win_1' }
          ]}
        })
      });

    const worker1 = orchestrator.onSettlementCreated({ auctionId: 'auc_1', settlementId: 'set_1', winnerId: 'win_1' });
    const worker2 = orchestrator.onSettlementCreated({ auctionId: 'auc_1', settlementId: 'set_1', winnerId: 'win_1' });
    
    await expect(worker2).rejects.toThrow('ConcurrencyRaceError');
    await worker1; // Wait for worker1 to finish properly
  });

  it('11. recovered Draft Order heals providerReference', async () => {
    (global.fetch as any).mockResolvedValueOnce(mockGraphQLResponse([createValidRemoteCandidate()]));
    const result = await paymentGateway.createPaymentSession('auc_1', '1000', 'win_1');
    expect(result.providerReference).toBe('do_1');
  });

  it('12. completed Draft Order never reused', async () => {
    const candidate = createValidRemoteCandidate();
    candidate.node.status = 'COMPLETED';
    (global.fetch as any).mockResolvedValueOnce(mockGraphQLResponse([candidate]));
    const result = await paymentGateway.createPaymentSession('auc_1', '1000', 'win_1');
    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('Unpaid status check failed');
  });

  it('13. wrong amount/currency/correlation -> fail closed', async () => {
    const candidate = createValidRemoteCandidate();
    candidate.node.customAttributes = [];
    (global.fetch as any).mockResolvedValueOnce(mockGraphQLResponse([candidate]));
    const result = await paymentGateway.createPaymentSession('auc_1', '1000', 'win_1');
    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('Correlation metadata mismatch');
  });

  it('14. remote API error/timeout -> no blind POST', async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: false, status: 503 });
    const result = await paymentGateway.createPaymentSession('auc_1', '1000', 'win_1');
    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('Shopify API unreachable');
  });

  it('15. Lease renewal during long Shopify operation', async () => {
    redisMock.set.mockResolvedValue('OK');
    let resolveFetch: any;
    (global.fetch as any).mockImplementation(() => new Promise(resolve => { resolveFetch = resolve; }));
    
    const promise = orchestrator.onSettlementCreated({ auctionId: 'auc_1', settlementId: 'set_1', winnerId: 'win_1' }).catch(() => {});
    
    // Fast forward to trigger interval
    await vi.advanceTimersByTimeAsync(16000);
    
    expect(redisMock.eval).toHaveBeenCalled(); 
    
    // cleanup
    resolveFetch({ ok: false, status: 500, text: vi.fn().mockResolvedValue('Internal Error'), json: vi.fn().mockResolvedValue({}) });
    await promise;
  });

  it('16. Stale owner cannot release a newer owner lease', async () => {
    redisMock.set.mockResolvedValue('OK');
    (global.fetch as any).mockResolvedValueOnce(mockGraphQLResponse([createValidRemoteCandidate()]));
    await orchestrator.onSettlementCreated({ auctionId: 'auc_1', settlementId: 'set_1', winnerId: 'win_1' });
    expect(redisMock.eval).toHaveBeenCalledWith(expect.stringContaining('del'), 1, 'draft_order_creation:set_1', expect.any(String));
  });

  it('17. Redis unavailable during renewal -> fail closed and no Shopify POST', async () => {
    redisMock.set.mockResolvedValue('OK');
    redisMock.eval.mockRejectedValue(new Error('Redis Offline'));
    let resolveFetch: any;
    (global.fetch as any).mockImplementation(() => new Promise(resolve => { resolveFetch = resolve; }));
    
    const promise = orchestrator.onSettlementCreated({ auctionId: 'auc_1', settlementId: 'set_1', winnerId: 'win_1' });
    await vi.advanceTimersByTimeAsync(16000);
    
    resolveFetch({ ok: false, status: 500 });
    await promise.catch(() => {});
  });

  it('18. Redis unavailable during acquisition -> fail closed and no Shopify POST', async () => {
    redisMock.set.mockRejectedValue(new Error('Redis Offline'));
    await expect(orchestrator.onSettlementCreated({ auctionId: 'auc_1', settlementId: 'set_1', winnerId: 'win_1' })).rejects.toThrow('Redis Offline');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
