/**
 * LEGXI Component Registry — Contracts
 *
 * Defines the interfaces that every registerable component must satisfy.
 * These contracts prevent component drift and ensure the Dynamic Renderer
 * can mount any component safely.
 */

import type { ComponentType } from 'react';
import type {
  ContentModuleType,
  LayoutKey,
  HeroKey,
  GalleryKey,
  ConsoleKey,
  CardKey,
  AnimationKey,
  ThemePresetKey,
  MediaType,
  SchemaVersion,
  ThemeConfig,
  BehaviorConfig,
  PermissionConfig,
  FeatureFlags,
  AuctionState,
  ShopifyProduct,
  ContentModule,
  ProductMedia,
} from './types';

// ─────────────────────────────────────────────
// 1. Section Module Contract
// ─────────────────────────────────────────────

export interface SectionModuleProps<TData = unknown> {
  data: TData;
  auctionId: string;
  themeContext: ThemeConfig;
  className?: string;
}

export interface SectionManifest {
  type: ContentModuleType;
  displayName: string;
  schemaVersions: SchemaVersion[];
}

export interface SectionRegistration<TData = unknown> {
  manifest: SectionManifest;
  component: ComponentType<SectionModuleProps<TData>>;
}

// ─────────────────────────────────────────────
// 2. Layout Contract
// ─────────────────────────────────────────────

export interface LayoutProps {
  product: ShopifyProduct;
  auction: AuctionState;
  behavior: BehaviorConfig;
  permissions: PermissionConfig;
  featureFlags: FeatureFlags;
  themeContext: ThemeConfig;
  contentModules: ContentModule[];
  heroSlot?: React.ReactNode;
  gallerySlot?: React.ReactNode;
  consoleSlot?: React.ReactNode;
  children?: React.ReactNode;
}

export interface LayoutManifest {
  key: LayoutKey;
  displayName: string;
  schemaVersions: SchemaVersion[];
  supportedModules: ContentModuleType[];
  supportedGalleries: GalleryKey[];
  supportedConsoles: ConsoleKey[];
  supportedHeroes: HeroKey[];
  supportedThemes: ThemePresetKey[];
  supportedMedia: MediaType[];
}

export interface LayoutRegistration {
  manifest: LayoutManifest;
  component: ComponentType<LayoutProps>;
}

// ─────────────────────────────────────────────
// 3. Hero Contract
// ─────────────────────────────────────────────

export interface HeroProps {
  product: ShopifyProduct;
  auction: AuctionState;
  themeContext: ThemeConfig;
}

export interface HeroRegistration {
  key: HeroKey;
  component: ComponentType<HeroProps>;
}

// ─────────────────────────────────────────────
// 4. Gallery Contract
// ─────────────────────────────────────────────

export interface GalleryProps {
  media: ProductMedia[];
  themeContext: ThemeConfig;
}

export interface GalleryRegistration {
  key: GalleryKey;
  component: ComponentType<GalleryProps>;
}

// ─────────────────────────────────────────────
// 5. Console Contract
// ─────────────────────────────────────────────

export interface ConsoleProps {
  auction: AuctionState;
  behavior: BehaviorConfig;
  permissions: PermissionConfig;
  featureFlags: FeatureFlags;
  themeContext: ThemeConfig;
}

export interface ConsoleRegistration {
  key: ConsoleKey;
  component: ComponentType<ConsoleProps>;
}

// ─────────────────────────────────────────────
// 6. Card Contract
// ─────────────────────────────────────────────

export interface CardProps {
  product: ShopifyProduct;
  auction: AuctionState;
  themeContext: ThemeConfig;
}

export interface CardRegistration {
  key: CardKey;
  component: ComponentType<CardProps>;
}

// ─────────────────────────────────────────────
// 7. Animation Contract
// ─────────────────────────────────────────────

export interface AnimationConfig {
  enter: string;
  exit: string;
  duration: number;
  easing: string;
}

export interface AnimationRegistration {
  key: AnimationKey;
  config: AnimationConfig;
}

// ─────────────────────────────────────────────
// 8. Theme Contract
// ─────────────────────────────────────────────

export interface ThemeTokens {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  primary: string;
  accent: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

export interface ThemeRegistration {
  key: ThemePresetKey;
  tokens: ThemeTokens;
}

// ─────────────────────────────────────────────
// 9. Media Renderer Contract
// ─────────────────────────────────────────────

export interface MediaRendererProps {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
}

export interface MediaRegistration {
  type: MediaType;
  component: ComponentType<MediaRendererProps>;
}
