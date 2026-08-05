import { z } from 'zod';
import {
  AUCTION_LIFECYCLE,
  LAYOUT_KEYS,
  HERO_KEYS,
  GALLERY_KEYS,
  CONSOLE_KEYS,
  CARD_KEYS,
  ANIMATION_KEYS,
  THEME_PRESET_KEYS,
  USER_ROLES,
  CONTENT_MODULE_TYPES,
  MEDIA_TYPES,
} from '../engine/types';

// ─────────────────────────────────────────────
// Shopify Product
// ─────────────────────────────────────────────

export const ProductMediaSchema = z.object({
  url: z.string().url(),
  type: z.enum(MEDIA_TYPES),
  alt: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const ProductSEOSchema = z.object({
  title: z.string(),
  description: z.string(),
});

export const ShopifyProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  handle: z.string(),
  vendor: z.string(),
  descriptionHtml: z.string(),
  seo: ProductSEOSchema,
  media: z.array(ProductMediaSchema),
});

// ─────────────────────────────────────────────
// Auction State
// ─────────────────────────────────────────────

export const BidSchema = z.object({
  id: z.string(),
  amount: z.number().positive(),
  timestamp: z.string().datetime(),
  bidder_mask: z.string(),
});

export const AuctionStateSchema = z.object({
  id: z.string(),
  status: z.enum(AUCTION_LIFECYCLE),
  current_bid: z.number().nonnegative(),
  next_valid_bid: z.number().nonnegative(),
  reserve_met: z.boolean(),
  bid_count: z.number().nonnegative(),
  watchers: z.number().nonnegative(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  extensions: z.number().nonnegative(),
  bids: z.array(BidSchema),
});

// ─────────────────────────────────────────────
// Auction Configuration
// ─────────────────────────────────────────────

export const VisualConfigSchema = z.object({
  layout: z.enum(LAYOUT_KEYS).catch('classic'),
  hero: z.enum(HERO_KEYS),
  gallery: z.enum(GALLERY_KEYS),
  console: z.enum(CONSOLE_KEYS),
  card: z.enum(CARD_KEYS),
  animation: z.enum(ANIMATION_KEYS),
});

export const BehaviorConfigSchema = z.object({
  show_reserve: z.boolean(),
  show_estimate: z.boolean(),
  show_watchers: z.boolean(),
  show_bidder_count: z.boolean(),
  show_bid_history: z.boolean(),
  allow_proxy_bid: z.boolean(),
  allow_auto_bid: z.boolean(),
  allow_share: z.boolean(),
  allow_watchlist: z.boolean(),
});

export const PermissionConfigSchema = z.object({
  require_login_to_bid: z.boolean(),
  require_kyc_to_bid: z.boolean(),
  min_role_to_view: z.enum(USER_ROLES),
  min_role_to_bid: z.enum(USER_ROLES),
  min_role_to_proxy_bid: z.enum(USER_ROLES),
  min_role_to_download_certificate: z.enum(USER_ROLES),
});

export const ThemeConfigSchema = z.object({
  theme_preset: z.enum(THEME_PRESET_KEYS),
  primary_color: z.string(),
  accent_color: z.string(),
});

export const FeatureFlagsSchema = z.object({
  enable_proxy_bid: z.boolean(),
  enable_auto_bid: z.boolean(),
  enable_live_chat: z.boolean(),
  enable_nft_certificate: z.boolean(),
  enable_offers: z.boolean(),
  enable_reserve_price: z.boolean(),
  enable_webrtc_preview: z.boolean(),
});

export const AuctionConfigurationSchema = z.object({
  schema_version: z.literal('v1'),
  visual: VisualConfigSchema,
  behavior: BehaviorConfigSchema,
  permissions: PermissionConfigSchema,
  theme: ThemeConfigSchema,
  feature_flags: FeatureFlagsSchema,
});

// ─────────────────────────────────────────────
// Content Modules
// ─────────────────────────────────────────────

const BaseModuleSchema = z.object({
  order: z.number(),
  locale: z.string().optional(),
  fallbackLocale: z.string().optional(),
});

export const StoryModuleSchema = BaseModuleSchema.extend({
  type: z.literal('auction_story'),
  data: z.object({
    heading: z.string(),
    narrative: z.string(),
    media: z.string().optional(),
  }),
});

export const PlayerProfileSchema = BaseModuleSchema.extend({
  type: z.literal('player_profile'),
  data: z.object({
    player_name: z.string(),
    team: z.string(),
    career_highlights: z.string().optional(),
    profile_image: z.string().optional(),
    player_stats: z.object({
      matches_played: z.number(),
      runs_scored: z.number(),
      wickets_taken: z.number(),
      highest_score: z.number(),
      centuries: z.number(),
      average: z.number(),
    }).optional(),
  }),
});

export const AuthenticationBlockSchema = BaseModuleSchema.extend({
  type: z.literal('authentication_block'),
  data: z.object({
    authenticator_name: z.string(),
    authentication_date: z.string(),
    methodology: z.string().optional(),
    seal_image: z.string().optional(),
  }),
});

export const ConditionReportSchema = BaseModuleSchema.extend({
  type: z.literal('condition_report'),
  data: z.object({
    grade: z.string(),
    wear_description: z.string().optional(),
    alterations: z.string().optional(),
    evaluator: z.string(),
    evaluation_date: z.string().optional(),
  }),
});

export const TimelineEventSchema = z.object({
  date: z.string(),
  event_title: z.string(),
  event_description: z.string().optional(),
  event_media: z.string().optional(),
});

export const TimelineSchema = BaseModuleSchema.extend({
  type: z.literal('timeline'),
  data: z.object({
    timeline_title: z.string(),
    timeline_events: z.array(TimelineEventSchema),
  }),
});

export const ShippingBlockSchema = BaseModuleSchema.extend({
  type: z.literal('shipping_block'),
  data: z.object({
    policy_title: z.string(),
    insurance_details: z.string().optional(),
    regions_supported: z.array(z.string()),
    estimated_delivery: z.string(),
  }),
});

export const FaqGroupSchema = BaseModuleSchema.extend({
  type: z.literal('faq_group'),
  data: z.object({
    group_title: z.string(),
    faq_entries: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })),
  }),
});

// A discriminated union to validate any recognized module
export const ContentModuleSchema = z.discriminatedUnion('type', [
  StoryModuleSchema,
  PlayerProfileSchema,
  AuthenticationBlockSchema,
  ConditionReportSchema,
  TimelineSchema,
  ShippingBlockSchema,
  FaqGroupSchema,
]);

// ─────────────────────────────────────────────
// Final Payload Schema
// ─────────────────────────────────────────────

export const ResolvedAuctionPageSchema = z.object({
  product: ShopifyProductSchema,
  auction: AuctionStateSchema,
  configuration: AuctionConfigurationSchema,
  content_modules: z.array(ContentModuleSchema),
});
