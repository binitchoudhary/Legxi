import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShopifyPaymentGateway } from '../src/infrastructure/adapters/ShopifyPaymentGateway';
import { AuctionRepositoryAdapter } from '../src/infrastructure/adapters/AuctionRepositoryAdapter';
import { SettlementRepositoryAdapter } from '../src/infrastructure/adapters/SettlementRepositoryAdapter';

// Provide explicit environment variable fallbacks for the test environment
process.env.SHOPIFY_STORE = 'test-store.myshopify.com';
process.env.SHOPIFY_ADMIN_TOKEN = 'test-token';
process.env.SHOPIFY_API_VERSION = '2025-10';

describe('ShopifyPaymentGateway Pricing Integrity (Layer 7)', () => {
  let mockAuctionRepo: any;
  let mockSettlementRepo: any;
  let gateway: ShopifyPaymentGateway;
  
  beforeEach(() => {
    vi.restoreAllMocks();
    
    mockAuctionRepo = { findById: vi.fn() };
    mockSettlementRepo = { findByAuctionId: vi.fn() };
    
    gateway = new ShopifyPaymentGateway(
      mockAuctionRepo as unknown as AuctionRepositoryAdapter,
      mockSettlementRepo as unknown as SettlementRepositoryAdapter
    );
    
    global.fetch = vi.fn();
  });

  const setupMocks = (catalogPrice: string, responseTotal: string, responseCurrency: string = 'INR') => {
    mockAuctionRepo.findById.mockResolvedValue({ id: 'auc_1', shopifyProductId: 'prod_1' });
    mockSettlementRepo.findByAuctionId.mockResolvedValue({ settlementId: 'set_1', auctionId: 'auc_1', providerReference: null });

    // Mock GraphQL Remote State Recovery search (returns empty edges)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { draftOrders: { edges: [], pageInfo: { hasNextPage: false } } }
      })
    } as any);

    // Mock Product GET
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        product: { variants: [{ id: 8888, price: catalogPrice }] }
      })
    } as any);

    // Mock Draft Order POST
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        draft_order: {
          id: 7777,
          total_price: responseTotal,
          currency: responseCurrency,
          invoice_url: 'https://test-checkout-url',
          note_attributes: [
            { name: '_settlement_id', value: 'set_1' },
            { name: '_auction_id', value: 'auc_1' },
            { name: '_winner_id', value: 'user_1' }
          ]
        }
      })
    } as any);
  };

  it('Test 1: catalog ₹415,000 / winning bid ₹10 → final total ₹10', async () => {
    setupMocks('415000.00', '10.00');
    const result = await gateway.createPaymentSession('auc_1', '1000', 'user_1'); // 1000 paise = 10.00
    
    expect(result.success).toBe(true);
    expect(result.paymentReference).toBe('https://test-checkout-url');

    const postCall = vi.mocked(fetch).mock.calls[2];
    const payload = JSON.parse(postCall[1]?.body as string);
    
    expect(payload.draft_order.applied_discount).toEqual({
      description: "Auction Winning Price Adjustment",
      value_type: "fixed_amount",
      value: "414990.00",
      amount: "414990.00"
    });
  });

  it('Test 2: catalog ₹100 / winning bid ₹100 → final total ₹100', async () => {
    setupMocks('100.00', '100.00');
    const result = await gateway.createPaymentSession('auc_1', '10000', 'user_1'); // 10000 paise = 100.00
    
    expect(result.success).toBe(true);
    const postCall = vi.mocked(fetch).mock.calls[2];
    const payload = JSON.parse(postCall[1]?.body as string);
    
    // No discount applied when equal
    expect(payload.draft_order.applied_discount).toBeUndefined();
  });

  it('Test 3: catalog ₹100 / winning bid ₹99 → final total ₹99', async () => {
    setupMocks('100.00', '99.00');
    const result = await gateway.createPaymentSession('auc_1', '9900', 'user_1');
    
    expect(result.success).toBe(true);
    const postCall = vi.mocked(fetch).mock.calls[2];
    const payload = JSON.parse(postCall[1]?.body as string);
    
    expect(payload.draft_order.applied_discount.value).toBe("1.00");
  });

  it('Test 4: catalog ₹100 / winning bid ₹101 → fail closed; no payable Draft Order', async () => {
    setupMocks('100.00', '101.00');
    const result = await gateway.createPaymentSession('auc_1', '10100', 'user_1');
    
    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('Auction amount exceeds Shopify catalog price');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('Test 5: catalog/variant resolution failure → fail closed', async () => {
    mockAuctionRepo.findById.mockResolvedValue({ id: 'auc_1', shopifyProductId: 'prod_1' });
    mockSettlementRepo.findByAuctionId.mockResolvedValue({ settlementId: 'set_1', auctionId: 'auc_1' });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { draftOrders: { edges: [], pageInfo: { hasNextPage: false } } }
      })
    } as any);

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Not Found'
    } as any);

    const result = await gateway.createPaymentSession('auc_1', '1000', 'user_1');
    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('Shopify API returned 404');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('Test 6: currency mismatch → fail closed', async () => {
    setupMocks('100.00', '10.00', 'USD');
    const result = await gateway.createPaymentSession('auc_1', '1000', 'user_1');
    
    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('Currency Integrity Failure');
  });

  it('Test 7: Shopify response total mismatch → fail closed', async () => {
    setupMocks('100.00', '20.00'); // We wanted 10.00, but Shopify gave 20.00
    const result = await gateway.createPaymentSession('auc_1', '1000', 'user_1');
    
    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('Pricing Integrity Failure: Shopify Draft Order total (20.00) does not match expected authoritative amount (10.00)');
  });

  it('Test 8: correlation metadata preserved', async () => {
    setupMocks('100.00', '10.00');
    const result = await gateway.createPaymentSession('auc_1', '1000', 'user_1');
    
    expect(result.success).toBe(true);
    const postCall = vi.mocked(fetch).mock.calls[2];
    const payload = JSON.parse(postCall[1]?.body as string);
    const notes = payload.draft_order.note_attributes;
    
    expect(notes).toContainEqual({ name: '_settlement_id', value: 'set_1' });
    expect(notes).toContainEqual({ name: '_auction_id', value: 'auc_1' });
    expect(notes).toContainEqual({ name: '_winner_id', value: 'user_1' });
  });

  it('Test 9: existing providerReference reuse remains safe', async () => {
    mockAuctionRepo.findById.mockResolvedValue({ id: 'auc_1', shopifyProductId: 'prod_1' });
    mockSettlementRepo.findByAuctionId.mockResolvedValue({
      settlementId: 'set_1',
      auctionId: 'auc_1',
      winnerId: 'user_1',
      providerReference: { provider: 'shopify', providerPaymentId: '7777' }
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        draft_order: {
          id: 7777,
          status: 'open',
          total_price: '10.00',
          currency: 'INR',
          invoice_url: 'https://test-reused-url',
          note_attributes: [
            { name: '_settlement_id', value: 'set_1' },
            { name: '_auction_id', value: 'auc_1' },
            { name: '_winner_id', value: 'user_1' }
          ]
        }
      })
    } as any);

    const result = await gateway.createPaymentSession('auc_1', '1000', 'user_1');
    expect(result.success).toBe(true);
    expect(result.paymentReference).toBe('https://test-reused-url');
    expect(fetch).toHaveBeenCalledTimes(1); // Only GET, no POST
  });

  it('Test 11: existing providerReference + non-INR currency → fail closed, no replacement POST', async () => {
    mockAuctionRepo.findById.mockResolvedValue({ id: 'auc_1', shopifyProductId: 'prod_1' });
    mockSettlementRepo.findByAuctionId.mockResolvedValue({
      settlementId: 'set_1',
      auctionId: 'auc_1',
      winnerId: 'user_1',
      providerReference: { provider: 'shopify', providerPaymentId: '7777' }
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        draft_order: {
          id: 7777,
          status: 'open',
          total_price: '10.00',
          currency: 'USD',
          invoice_url: 'https://test-reused-url',
          note_attributes: [
            { name: '_settlement_id', value: 'set_1' },
            { name: '_auction_id', value: 'auc_1' },
            { name: '_winner_id', value: 'user_1' }
          ]
        }
      })
    } as any);

    const result = await gateway.createPaymentSession('auc_1', '1000', 'user_1');
    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('Currency mismatch');
    expect(fetch).toHaveBeenCalledTimes(1); // Only GET, no replacement POST
  });

  it('Test 12: existing providerReference + amount mismatch → fail closed, no replacement POST', async () => {
    mockAuctionRepo.findById.mockResolvedValue({ id: 'auc_1', shopifyProductId: 'prod_1' });
    mockSettlementRepo.findByAuctionId.mockResolvedValue({
      settlementId: 'set_1',
      auctionId: 'auc_1',
      winnerId: 'user_1',
      providerReference: { provider: 'shopify', providerPaymentId: '7777' }
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        draft_order: {
          id: 7777,
          status: 'open',
          total_price: '999.00',
          currency: 'INR',
          invoice_url: 'https://test-reused-url',
          note_attributes: [
            { name: '_settlement_id', value: 'set_1' },
            { name: '_auction_id', value: 'auc_1' },
            { name: '_winner_id', value: 'user_1' }
          ]
        }
      })
    } as any);

    const result = await gateway.createPaymentSession('auc_1', '1000', 'user_1');
    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('Amount mismatch');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('Test 13: existing providerReference + correlation mismatch → fail closed, no replacement POST', async () => {
    mockAuctionRepo.findById.mockResolvedValue({ id: 'auc_1', shopifyProductId: 'prod_1' });
    mockSettlementRepo.findByAuctionId.mockResolvedValue({
      settlementId: 'set_1',
      auctionId: 'auc_1',
      winnerId: 'user_1',
      providerReference: { provider: 'shopify', providerPaymentId: '7777' }
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        draft_order: {
          id: 7777,
          status: 'open',
          total_price: '10.00',
          currency: 'INR',
          invoice_url: 'https://test-reused-url',
          note_attributes: [
            { name: '_settlement_id', value: 'WRONG_SET' },
            { name: '_auction_id', value: 'auc_1' },
            { name: '_winner_id', value: 'user_1' }
          ]
        }
      })
    } as any);

    const result = await gateway.createPaymentSession('auc_1', '1000', 'user_1');
    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('Correlation metadata mismatch');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('Test 14: existing providerReference + completed status → fail closed, no replacement POST', async () => {
    mockAuctionRepo.findById.mockResolvedValue({ id: 'auc_1', shopifyProductId: 'prod_1' });
    mockSettlementRepo.findByAuctionId.mockResolvedValue({
      settlementId: 'set_1',
      auctionId: 'auc_1',
      winnerId: 'user_1',
      providerReference: { provider: 'shopify', providerPaymentId: '7777' }
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        draft_order: {
          id: 7777,
          status: 'completed',
          total_price: '10.00',
          currency: 'INR',
          invoice_url: 'https://test-reused-url',
          note_attributes: [
            { name: '_settlement_id', value: 'set_1' },
            { name: '_auction_id', value: 'auc_1' },
            { name: '_winner_id', value: 'user_1' }
          ]
        }
      })
    } as any);

    const result = await gateway.createPaymentSession('auc_1', '1000', 'user_1');
    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('Unpaid status check failed');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('Test 10: cancellation safety remains unchanged', async () => {
    mockSettlementRepo.findByAuctionId.mockResolvedValue({
      settlementId: 'set_1',
      auctionId: 'auc_1',
      providerReference: { provider: 'shopify', providerPaymentId: '7777' }
    });

    // Mock GET (draft order still open)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ draft_order: { status: 'open' } })
    } as any);

    // Mock DELETE
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as any);

    const result = await gateway.cancelPayment('auc_1');
    expect(result.success).toBe(true);
  });
});

describe('syncSettlementOrder Pricing Integrity', () => {
  let mockAuctionRepo: any;
  let mockSettlementRepo: any;
  let gateway: ShopifyPaymentGateway;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockAuctionRepo = { findById: vi.fn() };
    mockSettlementRepo = { findByAuctionId: vi.fn() };
    gateway = new ShopifyPaymentGateway(
      mockAuctionRepo as unknown as AuctionRepositoryAdapter,
      mockSettlementRepo as unknown as SettlementRepositoryAdapter
    );
    global.fetch = vi.fn();
  });

  const setupOrderResponse = (total_price: string, currency: string = 'INR', financial_status: string = 'paid') => {
    // 1. fetch Draft Order
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ draft_order: { order_id: 12345 } })
    } as any);

    // 2. fetch Order
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        order: {
          id: 12345,
          financial_status,
          total_price,
          currency,
          note_attributes: [
            { name: '_settlement_id', value: 's_1' },
            { name: '_auction_id', value: 'a_1' },
            { name: '_winner_id', value: 'w_1' }
          ]
        }
      })
    } as any);
  };

  it('1. PASS: 1000 paise <-> "10.00" INR', async () => {
    setupOrderResponse('10.00');
    const result = await gateway.syncSettlementOrder('d_1', 's_1', 'a_1', 'w_1', '1000');
    expect(result.success).toBe(true);
  });

  it('2. PASS: 1000 paise <-> "10" INR', async () => {
    setupOrderResponse('10');
    const result = await gateway.syncSettlementOrder('d_1', 's_1', 'a_1', 'w_1', '1000');
    expect(result.success).toBe(true);
  });

  it('3. PASS: 1000 paise <-> "10.0" INR', async () => {
    setupOrderResponse('10.0');
    const result = await gateway.syncSettlementOrder('d_1', 's_1', 'a_1', 'w_1', '1000');
    expect(result.success).toBe(true);
  });

  it('4. FAIL: 1000 paise <-> "10.01" INR', async () => {
    setupOrderResponse('10.01');
    const result = await gateway.syncSettlementOrder('d_1', 's_1', 'a_1', 'w_1', '1000');
    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('Amount mismatch');
  });

  it('5. FAIL: 1000 paise <-> "9.99" INR', async () => {
    setupOrderResponse('9.99');
    const result = await gateway.syncSettlementOrder('d_1', 's_1', 'a_1', 'w_1', '1000');
    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('Amount mismatch');
  });

  it('6. FAIL: 1000 paise <-> "10.00" USD', async () => {
    setupOrderResponse('10.00', 'USD');
    const result = await gateway.syncSettlementOrder('d_1', 's_1', 'a_1', 'w_1', '1000');
    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('Currency mismatch');
  });

  it('7. FAIL: 1000 paise <-> ""', async () => {
    setupOrderResponse('');
    const result = await gateway.syncSettlementOrder('d_1', 's_1', 'a_1', 'w_1', '1000');
    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('Amount validation failed: Invalid amount format');
  });

  it('8. FAIL: 1000 paise <-> "10.000"', async () => {
    setupOrderResponse('10.000');
    const result = await gateway.syncSettlementOrder('d_1', 's_1', 'a_1', 'w_1', '1000');
    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('Amount validation failed: Malformed amount or unsupported precision');
  });

  it('9. FAIL: 1000 paise <-> "10,00"', async () => {
    setupOrderResponse('10,00');
    const result = await gateway.syncSettlementOrder('d_1', 's_1', 'a_1', 'w_1', '1000');
    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('Amount validation failed: Malformed amount or unsupported precision');
  });
});

