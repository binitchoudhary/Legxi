/**
 * LEGXI Validator — Unit Tests
 */

import {
  validateAuctionConfiguration,
  validateResolvedPage,
} from '../engine/validator';
import type {
  AuctionConfiguration,
  ResolvedAuctionPage,
} from '../engine/types';

// ─────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────

function makeValidConfig(): AuctionConfiguration {
  return {
    schema_version: 'v1',
    visual: {
      layout: 'jersey',
      hero: 'immersive',
      gallery: 'carousel',
      console: 'floating',
      card: 'glassmorphism',
      animation: 'smooth',
    },
    behavior: {
      show_reserve: true,
      show_estimate: true,
      show_watchers: true,
      show_bidder_count: true,
      show_bid_history: true,
      allow_proxy_bid: false,
      allow_auto_bid: false,
      allow_share: true,
      allow_watchlist: true,
    },
    permissions: {
      require_login_to_bid: true,
      require_kyc_to_bid: false,
      min_role_to_view: 'guest',
      min_role_to_bid: 'registered',
      min_role_to_proxy_bid: 'vip',
      min_role_to_download_certificate: 'registered',
    },
    theme: {
      theme_preset: 'gold',
      primary_color: '#D4AF37',
      accent_color: '#1A1A2E',
    },
    feature_flags: {
      enable_proxy_bid: false,
      enable_auto_bid: false,
      enable_live_chat: false,
      enable_nft_certificate: true,
      enable_offers: false,
      enable_reserve_price: true,
      enable_webrtc_preview: false,
    },
  };
}

function makeValidPage(): ResolvedAuctionPage {
  return {
    product: {
      id: 'gid://shopify/Product/123',
      title: 'Test Jersey',
      handle: 'test-jersey',
      vendor: 'LEGXI',
      descriptionHtml: '<p>Test</p>',
      seo: { title: 'Test', description: 'Test' },
      media: [{ url: 'https://example.com/img.jpg', type: 'IMAGE' }],
    },
    auction: {
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
    },
    configuration: makeValidConfig(),
    content_modules: [
      { type: 'auction_story', order: 1, data: { heading: 'Test', narrative: '<p>Hi</p>' } },
    ],
  };
}

// ─────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────

describe('LEGXI Configuration Validator', () => {
  describe('validateAuctionConfiguration', () => {
    it('passes for a valid configuration', () => {
      const result = validateAuctionConfiguration(makeValidConfig());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails when schema_version is missing', () => {
      const config = makeValidConfig();
      (config as any).schema_version = undefined;
      const result = validateAuctionConfiguration(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'E-2001')).toBe(true);
    });

    it('fails when visual config is missing', () => {
      const config = makeValidConfig();
      (config as any).visual = undefined;
      const result = validateAuctionConfiguration(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'visual')).toBe(true);
    });

    it('fails when layout key is invalid', () => {
      const config = makeValidConfig();
      (config.visual as any).layout = 'hologram';
      const result = validateAuctionConfiguration(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'visual.layout')).toBe(true);
    });

    it('warns when hero key is invalid', () => {
      const config = makeValidConfig();
      (config.visual as any).hero = 'cinematic';
      const result = validateAuctionConfiguration(config);
      expect(result.valid).toBe(true); // warnings don't fail
      expect(result.warnings.some(e => e.field === 'visual.hero')).toBe(true);
    });

    it('fails when permission role hierarchy is violated', () => {
      const config = makeValidConfig();
      config.permissions.min_role_to_view = 'verified';
      config.permissions.min_role_to_bid = 'registered'; // lower than view
      const result = validateAuctionConfiguration(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'E-2003')).toBe(true);
    });

    it('fails when behavior config is missing', () => {
      const config = makeValidConfig();
      (config as any).behavior = undefined;
      const result = validateAuctionConfiguration(config);
      expect(result.valid).toBe(false);
    });

    it('fails when permission config is missing', () => {
      const config = makeValidConfig();
      (config as any).permissions = undefined;
      const result = validateAuctionConfiguration(config);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateResolvedPage', () => {
    it('passes for a valid page', () => {
      const result = validateResolvedPage(makeValidPage());
      expect(result.valid).toBe(true);
    });

    it('fails when product is missing', () => {
      const page = makeValidPage();
      (page as any).product = undefined;
      const result = validateResolvedPage(page);
      expect(result.valid).toBe(false);
    });

    it('fails when auction state is missing', () => {
      const page = makeValidPage();
      (page as any).auction = undefined;
      const result = validateResolvedPage(page);
      expect(result.valid).toBe(false);
    });

    it('fails when auction status is invalid', () => {
      const page = makeValidPage();
      (page.auction as any).status = 'EXPLODED';
      const result = validateResolvedPage(page);
      expect(result.valid).toBe(false);
    });

    it('warns on duplicate content module order', () => {
      const page = makeValidPage();
      page.content_modules = [
        { type: 'auction_story', order: 1, data: {} },
        { type: 'player_profile', order: 1, data: {} }, // duplicate order
      ];
      const result = validateResolvedPage(page);
      expect(result.warnings.some(w => w.message.includes('Duplicate order'))).toBe(true);
    });

    it('warns when product has no media', () => {
      const page = makeValidPage();
      page.product.media = [];
      const result = validateResolvedPage(page);
      expect(result.warnings.some(w => w.field === 'product.media')).toBe(true);
    });
  });
});
