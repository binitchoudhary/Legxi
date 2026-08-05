/**
 * LEGXI Auction Engine — Core Domain Types
 * 
 * These types define the contracts between Shopify, the Auction Backend,
 * and the Next.js Renderer. They are the single source of truth for
 * data structures flowing through the system.
 */

// ─────────────────────────────────────────────
// 1. Auction Lifecycle FSM
// ─────────────────────────────────────────────

export const AUCTION_LIFECYCLE = [
  'DRAFT',
  'SCHEDULED',
  'PREVIEW',
  'LIVE',
  'EXTENDED',
  'ENDING',
  'SETTLING',
  'PAID',
  'CERTIFICATE_PENDING',
  'COMPLETED',
  'ARCHIVED',
  'CANCELLED',
] as const;

export type AuctionLifecycleState = (typeof AUCTION_LIFECYCLE)[number];

/**
 * Maps each lifecycle state to the UI intent it drives.
 * Components resolve their behavior from this, never from raw string checks.
 */
export const LIFECYCLE_UI_INTENT: Record<AuctionLifecycleState, string> = {
  DRAFT:               'hidden',
  SCHEDULED:           'notify_me',
  PREVIEW:             'notify_me',
  LIVE:                'place_bid',
  EXTENDED:            'place_bid',
  ENDING:              'place_bid_urgent',
  SETTLING:            'waiting_for_payment',
  PAID:                'preparing_certificate',
  CERTIFICATE_PENDING: 'preparing_certificate',
  COMPLETED:           'view_certificate',
  ARCHIVED:            'view_history',
  CANCELLED:           'auction_cancelled',
};

// ─────────────────────────────────────────────
// 2. Visual Configuration
// ─────────────────────────────────────────────

export const LAYOUT_KEYS = ['jersey', 'poster', 'card', 'bat', 'ball', 'frame', 'coin', 'memorabilia', 'bundle', 'classic'] as const;
export const HERO_KEYS = ['immersive', 'split', 'classic', 'minimal'] as const;
export const GALLERY_KEYS = ['carousel', 'grid', 'stack', 'fullscreen'] as const;
export const CONSOLE_KEYS = ['sidebar', 'floating', 'inline'] as const;
export const CARD_KEYS = ['glassmorphism', 'flat', '3d', 'minimal'] as const;
export const ANIMATION_KEYS = ['spring', 'smooth', 'none'] as const;
export const THEME_PRESET_KEYS = ['gold', 'platinum', 'dark', 'cricket', 'football', 'limited'] as const;

export type LayoutKey = (typeof LAYOUT_KEYS)[number];
export type HeroKey = (typeof HERO_KEYS)[number];
export type GalleryKey = (typeof GALLERY_KEYS)[number];
export type ConsoleKey = (typeof CONSOLE_KEYS)[number];
export type CardKey = (typeof CARD_KEYS)[number];
export type AnimationKey = (typeof ANIMATION_KEYS)[number];
export type ThemePresetKey = (typeof THEME_PRESET_KEYS)[number];

export interface VisualConfig {
  layout: LayoutKey;
  hero: HeroKey;
  gallery: GalleryKey;
  console: ConsoleKey;
  card: CardKey;
  animation: AnimationKey;
}

// ─────────────────────────────────────────────
// 3. Behavior Configuration
// ─────────────────────────────────────────────

export interface BehaviorConfig {
  show_reserve: boolean;
  show_estimate: boolean;
  show_watchers: boolean;
  show_bidder_count: boolean;
  show_bid_history: boolean;
  allow_proxy_bid: boolean;
  allow_auto_bid: boolean;
  allow_share: boolean;
  allow_watchlist: boolean;
}

// ─────────────────────────────────────────────
// 4. Permission Configuration
// ─────────────────────────────────────────────

export const USER_ROLES = ['guest', 'registered', 'verified', 'vip', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface PermissionConfig {
  require_login_to_bid: boolean;
  require_kyc_to_bid: boolean;
  min_role_to_view: UserRole;
  min_role_to_bid: UserRole;
  min_role_to_proxy_bid: UserRole;
  min_role_to_download_certificate: UserRole;
}

// ─────────────────────────────────────────────
// 5. Theme Configuration
// ─────────────────────────────────────────────

export interface ThemeConfig {
  theme_preset: ThemePresetKey;
  primary_color: string;
  accent_color: string;
}

// ─────────────────────────────────────────────
// 6. Feature Flags
// ─────────────────────────────────────────────

export interface FeatureFlags {
  enable_proxy_bid: boolean;
  enable_auto_bid: boolean;
  enable_live_chat: boolean;
  enable_nft_certificate: boolean;
  enable_offers: boolean;
  enable_reserve_price: boolean;
  enable_webrtc_preview: boolean;
}

// ─────────────────────────────────────────────
// 7. Auction Configuration (Root)
// ─────────────────────────────────────────────

export type SchemaVersion = 'v1';

export interface AuctionConfiguration {
  schema_version: SchemaVersion;
  visual: VisualConfig;
  behavior: BehaviorConfig;
  permissions: PermissionConfig;
  theme: ThemeConfig;
  feature_flags: FeatureFlags;
}

// ─────────────────────────────────────────────
// 8. Content Module Types
// ─────────────────────────────────────────────

export const CONTENT_MODULE_TYPES = [
  'auction_story',
  'player_profile',
  'authentication_block',
  'condition_report',
  'timeline',
  'shipping_block',
  'faq_group',
] as const;

export type ContentModuleType = (typeof CONTENT_MODULE_TYPES)[number];

export interface ContentModule<T = unknown> {
  type: ContentModuleType;
  order: number;
  locale?: string;
  fallbackLocale?: string;
  data: T;
}

// Specific module data shapes

export interface StoryModuleData {
  heading: string;
  narrative: string;
  media?: string;
}

export interface PlayerStatsData {
  matches_played: number;
  runs_scored: number;
  wickets_taken: number;
  highest_score: number;
  centuries: number;
  average: number;
}

export interface PlayerProfileData {
  player_name: string;
  team: string;
  career_highlights?: string;
  profile_image?: string;
  player_stats?: PlayerStatsData;
}

export interface AuthenticationBlockData {
  authenticator_name: string;
  authentication_date: string;
  methodology?: string;
  seal_image?: string;
}

export interface ConditionReportData {
  grade: string;
  wear_description?: string;
  alterations?: string;
  evaluator: string;
  evaluation_date?: string;
}

export interface TimelineEventData {
  date: string;
  event_title: string;
  event_description?: string;
  event_media?: string;
}

export interface TimelineData {
  timeline_title: string;
  timeline_events: TimelineEventData[];
}

export interface ShippingBlockData {
  policy_title: string;
  insurance_details?: string;
  regions_supported: string[];
  estimated_delivery: string;
}

export interface FaqEntryData {
  question: string;
  answer: string;
}

export interface FaqGroupData {
  group_title: string;
  faq_entries: FaqEntryData[];
}

// ─────────────────────────────────────────────
// 9. Shopify Product (CMS — Read Only)
// ─────────────────────────────────────────────

export const MEDIA_TYPES = ['IMAGE', 'VIDEO', 'MODEL_3D', 'EXTERNAL_VIDEO', 'PDF', 'AUDIO'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export interface ProductMedia {
  url: string;
  type: MediaType;
  alt?: string;
  width?: number;
  height?: number;
}

export interface ProductSEO {
  title: string;
  description: string;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  descriptionHtml: string;
  seo: ProductSEO;
  media: ProductMedia[];
}

// ─────────────────────────────────────────────
// 10. Auction State (Backend — Real-time)
// ─────────────────────────────────────────────

export interface Bid {
  id: string;
  amount: number;
  timestamp: string;
  bidder_mask: string;
}

export interface AuctionState {
  id: string;
  status: AuctionLifecycleState;
  current_bid: number;
  next_valid_bid: number;
  reserve_met: boolean;
  bid_count: number;
  watchers: number;
  start_time: string;
  end_time: string;
  extensions: number;
  bids: Bid[];
}

// ─────────────────────────────────────────────
// 11. Resolved Auction Page (Merged Payload)
// ─────────────────────────────────────────────

export interface ResolvedAuctionPage {
  product: ShopifyProduct;
  auction: AuctionState;
  configuration: AuctionConfiguration;
  content_modules: ContentModule[];
}
