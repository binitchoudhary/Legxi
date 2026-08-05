/**
 * LEGXI Resolver — Unit Tests
 */

import { resolveAuctionPage, IResolverServices } from '../resolver/index';
import { AuctionValidationError, AuctionNetworkError, AuctionTimeoutError, AuctionPermissionError } from '../resolver/errors';
import { NextAuctionServices } from '../resolver/fetcher';
import { logger } from '../engine/logger';
import { resolveLocalizedModule } from '../resolver/index';

// ─────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────

const mockProduct = {
  id: 'gid://shopify/Product/123',
  title: 'Test Jersey',
  handle: 'test-jersey',
  vendor: 'LEGXI',
  descriptionHtml: '<p>Test</p>',
  seo: { title: 'Test', description: 'Test' },
  media: [{ url: 'https://example.com/img.jpg', type: 'IMAGE' }],
};

const mockConfig = {
  schema_version: 'v1',
  visual: { layout: 'jersey', hero: 'immersive', gallery: 'carousel', console: 'floating', card: 'glassmorphism', animation: 'smooth' },
  behavior: { show_reserve: true, show_estimate: true, show_watchers: true, show_bidder_count: true, show_bid_history: true, allow_proxy_bid: false, allow_auto_bid: false, allow_share: true, allow_watchlist: true },
  permissions: { require_login_to_bid: true, require_kyc_to_bid: false, min_role_to_view: 'guest', min_role_to_bid: 'registered', min_role_to_proxy_bid: 'vip', min_role_to_download_certificate: 'registered' },
  theme: { theme_preset: 'gold', primary_color: '#D4AF37', accent_color: '#1A1A2E' },
  feature_flags: { enable_proxy_bid: false, enable_auto_bid: false, enable_live_chat: false, enable_nft_certificate: true, enable_offers: false, enable_reserve_price: true, enable_webrtc_preview: false },
};

const mockState = {
  id: 'auc_1',
  status: 'LIVE',
  current_bid: 100000,
  next_valid_bid: 125000,
  reserve_met: false,
  bid_count: 3,
  watchers: 10,
  start_time: '2026-01-01T00:00:00Z',
  end_time: '2026-01-02T00:00:00Z',
  extensions: 0,
  bids: [],
};

const validStoryModule = {
  type: 'auction_story',
  order: 1,
  locale: 'en',
  fallbackLocale: 'en',
  data: { heading: 'Story', narrative: '<p>Hi</p>' }
};

const validTimelineModule = {
  type: 'timeline',
  order: 2,
  data: { timeline_title: 'History', timeline_events: [] }
};

const mockPayload = {
  product: mockProduct,
  configuration: mockConfig,
  auction: mockState,
  content_modules: [validStoryModule, validTimelineModule]
};

const makeServices = (overrides = {}): IResolverServices => ({
  fetchResolvedPayload: jest.fn().mockResolvedValue(mockPayload),
  ...overrides,
});

// ─────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────

describe('LEGXI Metaobject Resolver', () => {
  beforeEach(() => {
    logger.clearBuffer();
  });

  describe('Core Resolution & Validation', () => {
    it('resolves a valid payload with ONE endpoint', async () => {
      const services = makeServices();
      const result = await resolveAuctionPage('test-handle', services);
      
      expect(result).toBeDefined();
      expect(result.product.handle).toBe('test-jersey');
      expect(result.content_modules).toHaveLength(2);

      // Verify fetch options
      expect(services.fetchResolvedPayload).toHaveBeenCalledWith('test-handle', { cachePolicy: 'no-store' });
    });

    it('throws AuctionValidationError if Product fails validation', async () => {
      const services = makeServices({
        fetchResolvedPayload: jest.fn().mockResolvedValue({ ...mockPayload, product: { ...mockProduct, handle: undefined } })
      });
      await expect(resolveAuctionPage('test-handle', services)).rejects.toThrow(AuctionValidationError);
    });

    it('throws AuctionValidationError if Configuration fails validation', async () => {
      const services = makeServices({
        fetchResolvedPayload: jest.fn().mockResolvedValue({ ...mockPayload, configuration: { ...mockConfig, schema_version: undefined } })
      });
      await expect(resolveAuctionPage('test-handle', services)).rejects.toThrow(AuctionValidationError);
    });
    
    it('throws AuctionValidationError if Payload is completely broken', async () => {
      const services = makeServices({
        fetchResolvedPayload: jest.fn().mockResolvedValue(null)
      });
      await expect(resolveAuctionPage('test-handle', services)).rejects.toThrow(AuctionValidationError);
    });
  });

  describe('Partial Module Failures (Change 2)', () => {
    it('handles partial module failures independently', async () => {
      // Story = valid, Player Profile = valid, Timeline = invalid, Condition = valid, Auth = valid
      const story = { type: 'auction_story', order: 1, data: { heading: 'Story', narrative: '...' } };
      const profile = { type: 'player_profile', order: 2, data: { player_name: 'Player', team: 'Team' } };
      const timeline = { type: 'timeline', order: 3, data: { timeline_title: 123 } }; // Invalid: timeline_title must be string
      const condition = { type: 'condition_report', order: 4, data: { grade: 'A', evaluator: 'LEGXI' } };
      const auth = { type: 'authentication_block', order: 5, data: { authenticator_name: 'LEGXI', authentication_date: '2026' } };

      const services = makeServices({
        fetchResolvedPayload: jest.fn().mockResolvedValue({
          ...mockPayload,
          content_modules: [story, profile, timeline, condition, auth]
        })
      });

      const result = await resolveAuctionPage('test-handle', services);
      
      // Should have skipped timeline but kept the 4 valid ones
      expect(result.content_modules).toHaveLength(4);
      expect(result.content_modules.map(m => m.type)).toEqual([
        'auction_story', 'player_profile', 'condition_report', 'authentication_block'
      ]);

      // Logs W-6201
      const logs = logger.getBuffer();
      expect(logs.some(l => l.code === 'W-6201')).toBe(true);
    });

    it('sorts modules by order index', async () => {
      const services = makeServices({
        fetchResolvedPayload: jest.fn().mockResolvedValue({
          ...mockPayload,
          content_modules: [validTimelineModule, validStoryModule] // Timeline is order 2, Story is order 1
        })
      });

      const result = await resolveAuctionPage('test-handle', services);
      
      expect(result.content_modules[0].type).toBe('auction_story'); // order 1
      expect(result.content_modules[1].type).toBe('timeline');      // order 2
    });
  });

  describe('Localization (Change 4)', () => {
    it('resolves localized modules requested -> fallback -> default', () => {
      const enModule = { type: 'auction_story', order: 1, locale: 'en', fallbackLocale: 'en', data: { heading: 'En', narrative: '...' } } as any;
      const frModule = { type: 'auction_story', order: 1, locale: 'fr', fallbackLocale: 'en', data: { heading: 'Fr', narrative: '...' } } as any;
      const universalModule = { type: 'auction_story', order: 1, data: { heading: 'U', narrative: '...' } } as any;

      // Request fr -> matches frModule exactly
      expect(resolveLocalizedModule(frModule, 'fr')).toBe(true);
      
      // Request en -> matches frModule fallback locale
      expect(resolveLocalizedModule(frModule, 'en')).toBe(true);

      // Universal module matches anything
      expect(resolveLocalizedModule(universalModule, 'en')).toBe(true);
      expect(resolveLocalizedModule(universalModule, 'fr')).toBe(true);
      
      // Non-match
      expect(resolveLocalizedModule(enModule, 'fr')).toBe(false);
    });

    it('filters out non-matching locales during payload resolution', async () => {
      const enModule = { type: 'auction_story', order: 1, locale: 'en', fallbackLocale: 'en', data: { heading: 'En', narrative: '...' } };
      const frModule = { type: 'auction_story', order: 2, locale: 'fr', fallbackLocale: 'en', data: { heading: 'Fr', narrative: '...' } };

      const services = makeServices({
        fetchResolvedPayload: jest.fn().mockResolvedValue({
          ...mockPayload,
          content_modules: [enModule, frModule]
        })
      });

      // Request fr: enModule does not match (returns false), frModule matches 'fr'
      const result = await resolveAuctionPage('test-handle', services, 'fr');
      expect(result.content_modules).toHaveLength(1);
      expect(result.content_modules[0].locale).toBe('fr');
    });
  });

  describe('Observability (Change 5)', () => {
    it('logs performance timings', async () => {
      const services = makeServices();
      await resolveAuctionPage('test-handle', services);

      const logs = logger.getBuffer();
      
      expect(logs.some(l => l.code === 'I-6102')).toBe(true); // Fetch
      expect(logs.some(l => l.code === 'I-6104')).toBe(true); // Validation
      expect(logs.some(l => l.code === 'I-6105')).toBe(true); // Total
    });
    it('throws network error from index.ts if fetch fails', async () => {
      const services = makeServices({
        fetchResolvedPayload: jest.fn().mockRejectedValue(new Error('Network Down'))
      });
      await expect(resolveAuctionPage('test-handle', services)).rejects.toThrow('Network Down');
    });
    
    it('handles missing content_modules gracefully', async () => {
      const payloadWithoutModules = { ...mockPayload, content_modules: undefined };
      const services = makeServices({
        fetchResolvedPayload: jest.fn().mockResolvedValue(payloadWithoutModules)
      });
      const result = await resolveAuctionPage('test-handle', services);
      expect(result.content_modules).toEqual([]);
    });

    it('handles fallbackLocale without primary locale', () => {
      const module = { type: 'auction_story', order: 1, fallbackLocale: 'en', data: {} } as any;
      expect(resolveLocalizedModule(module, 'en')).toBe(true);
      expect(resolveLocalizedModule(module, 'fr')).toBe(false);
    });
  });

  describe('Edge Cases & Fetcher Retries (Change 8)', () => {
    let globalFetch: jest.Mock;

    beforeEach(() => {
      globalFetch = jest.fn();
      global.fetch = globalFetch;
    });

    it('maps cachePolicy: revalidate correctly', async () => {
      globalFetch.mockResolvedValue({ ok: true, json: async () => mockPayload });
      const fetcher = new NextAuctionServices('http://api');
      await fetcher.fetchResolvedPayload('test', { cachePolicy: 'revalidate', revalidateSeconds: 120 });
      expect(globalFetch).toHaveBeenCalledWith('http://api/auctions/by-product/test', { next: { revalidate: 120 }, signal: expect.any(AbortSignal) });
    });

    it('throws AuctionNetworkError 404 immediately without retries', async () => {
      globalFetch.mockResolvedValue({ ok: false, status: 404 });
      const fetcher = new NextAuctionServices('http://api');
      
      await expect(fetcher.fetchResolvedPayload('test', { cachePolicy: 'no-store' }))
        .rejects.toThrow(AuctionNetworkError);
        
      expect(globalFetch).toHaveBeenCalledTimes(1);
    });

    it('throws AuctionPermissionError 401/403 immediately without retries', async () => {
      globalFetch.mockResolvedValue({ ok: false, status: 401 });
      const fetcher = new NextAuctionServices('http://api');
      
      await expect(fetcher.fetchResolvedPayload('test', { cachePolicy: 'no-store' }))
        .rejects.toThrow(AuctionPermissionError);
        
      expect(globalFetch).toHaveBeenCalledTimes(1);
    });
    
    it('throws generic HTTP error (e.g. 400) immediately', async () => {
      globalFetch.mockResolvedValue({ ok: false, status: 400 });
      const fetcher = new NextAuctionServices('http://api');
      await expect(fetcher.fetchResolvedPayload('test', { cachePolicy: 'no-store' }))
        .rejects.toThrow(AuctionNetworkError);
    });
    
    it('throws generic network failure if out of retries', async () => {
      globalFetch.mockRejectedValue(new Error('DNS Failure'));
      const fetcher = new NextAuctionServices('http://api');
      
      jest.useFakeTimers();
      const p = fetcher.fetchResolvedPayload('test', { cachePolicy: 'no-store' }).catch(e => e);
      for(let i=0; i<6; i++) {
        await jest.advanceTimersByTimeAsync(8000);
      }
      
      const result = await p;
      expect(result).toBeInstanceOf(AuctionNetworkError);
      expect(result.message).toContain('Fetch failed after retries');
      jest.useRealTimers();
    });

    it('retries on 500 error and succeeds', async () => {
      globalFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      globalFetch.mockResolvedValueOnce({ ok: true, json: async () => mockPayload });
      
      const fetcher = new NextAuctionServices('http://api');
      
      jest.useFakeTimers();
      const p = fetcher.fetchResolvedPayload('test', { cachePolicy: 'no-store' });
      
      await jest.advanceTimersByTimeAsync(600);
      
      const result = await p;
      expect(result).toBeDefined();
      expect(globalFetch).toHaveBeenCalledTimes(2);
      
      jest.useRealTimers();
    });

    it('handles AbortError timeout', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      
      globalFetch.mockRejectedValue(abortError);
      
      const fetcher = new NextAuctionServices('http://api');
      
      jest.useFakeTimers();
      const p = fetcher.fetchResolvedPayload('test', { cachePolicy: 'no-store' }).catch(e => e);
      
      for(let i=0; i<6; i++) {
        await jest.advanceTimersByTimeAsync(8000);
      }
      
      const result = await p;
      expect(result).toBeInstanceOf(AuctionTimeoutError);
      jest.useRealTimers();
    });
  });
});
