import { resolveAuctionPage } from './src/features/auctions/resolver/index';

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
  bids: [{ id: 'bid_1', amount: 100000, timestamp: '2026-01-01T00:05:00Z', bidder_mask: '***123' }],
};

const story = { type: 'auction_story', order: 1, locale: 'en', fallbackLocale: 'en', data: { heading: 'Story', narrative: '...' } };
const profile = { type: 'player_profile', order: 2, data: { player_name: 'Player', team: 'Team' } };

const services = {
  fetchProduct: async () => mockProduct,
  fetchConfiguration: async () => mockConfig,
  fetchAuctionState: async () => mockState,
  fetchContentModules: async () => [story, profile],
};

async function run() {
  const result = await resolveAuctionPage('test-handle', services as any);
  console.log(JSON.stringify(result, null, 2));
}

run().catch(console.error);
