/**
 * LEGXI Component Registry — Versioned
 *
 * The registry is the heart of the Dynamic Renderer. It maps string keys
 * (from the Auction Configuration) to lazy-loaded React components.
 *
 * Rules:
 * 1. Each schema version gets its own RegistrySet.
 * 2. Adding a new layout/section/theme NEVER modifies existing code —
 *    you only add an entry to the map.
 * 3. If a key is not found, the resolver falls back (see defaults.ts).
 * 4. Unknown versions fall back to the latest version.
 */

import type { ComponentType } from 'react';
import type {
  SchemaVersion,
  LayoutKey,
  HeroKey,
  GalleryKey,
  ConsoleKey,
  CardKey,
  AnimationKey,
  ThemePresetKey,
  MediaType,
  ContentModuleType,
} from './types';
import type {
  LayoutRegistration,
  HeroRegistration,
  GalleryRegistration,
  ConsoleRegistration,
  CardRegistration,
  AnimationRegistration,
  ThemeRegistration,
  MediaRegistration,
  SectionRegistration,
  LayoutManifest,
} from './contracts';
import { FALLBACK_DEFAULTS } from './defaults';
import { logger } from './logger';

// ─────────────────────────────────────────────
// Registry Set (one per schema version)
// ─────────────────────────────────────────────

export interface RegistrySet {
  layouts: Map<LayoutKey, LayoutRegistration>;
  sections: Map<ContentModuleType, SectionRegistration>;
  heroes: Map<HeroKey, HeroRegistration>;
  galleries: Map<GalleryKey, GalleryRegistration>;
  consoles: Map<ConsoleKey, ConsoleRegistration>;
  cards: Map<CardKey, CardRegistration>;
  animations: Map<AnimationKey, AnimationRegistration>;
  themes: Map<ThemePresetKey, ThemeRegistration>;
  media: Map<MediaType, MediaRegistration>;
}

function createEmptyRegistrySet(): RegistrySet {
  return {
    layouts: new Map(),
    sections: new Map(),
    heroes: new Map(),
    galleries: new Map(),
    consoles: new Map(),
    cards: new Map(),
    animations: new Map(),
    themes: new Map(),
    media: new Map(),
  };
}

// ─────────────────────────────────────────────
// Versioned Registry Store
// ─────────────────────────────────────────────

const versionedRegistries = new Map<SchemaVersion, RegistrySet>();
let latestVersion: SchemaVersion = 'v1';

/**
 * Ensures a RegistrySet exists for the given version.
 */
function ensureVersion(version: SchemaVersion): RegistrySet {
  if (!versionedRegistries.has(version)) {
    versionedRegistries.set(version, createEmptyRegistrySet());
  }
  return versionedRegistries.get(version)!;
}

// ─────────────────────────────────────────────
// Registration Functions (called at startup)
// ─────────────────────────────────────────────

export function registerLayout(version: SchemaVersion, registration: LayoutRegistration): void {
  ensureVersion(version).layouts.set(registration.manifest.key, registration);
}

export function registerSection(version: SchemaVersion, registration: SectionRegistration): void {
  ensureVersion(version).sections.set(registration.manifest.type, registration);
}

export function registerHero(version: SchemaVersion, registration: HeroRegistration): void {
  ensureVersion(version).heroes.set(registration.key, registration);
}

export function registerGallery(version: SchemaVersion, registration: GalleryRegistration): void {
  ensureVersion(version).galleries.set(registration.key, registration);
}

export function registerConsole(version: SchemaVersion, registration: ConsoleRegistration): void {
  ensureVersion(version).consoles.set(registration.key, registration);
}

export function registerCard(version: SchemaVersion, registration: CardRegistration): void {
  ensureVersion(version).cards.set(registration.key, registration);
}

export function registerAnimation(version: SchemaVersion, registration: AnimationRegistration): void {
  ensureVersion(version).animations.set(registration.key, registration);
}

export function registerTheme(version: SchemaVersion, registration: ThemeRegistration): void {
  ensureVersion(version).themes.set(registration.key, registration);
}

export function registerMedia(version: SchemaVersion, registration: MediaRegistration): void {
  ensureVersion(version).media.set(registration.type, registration);
}

export function setLatestVersion(version: SchemaVersion): void {
  latestVersion = version;
}

// ─────────────────────────────────────────────
// Resolution Functions (called by renderer)
// ─────────────────────────────────────────────

function getRegistry(version: SchemaVersion | undefined): RegistrySet {
  const v = version ?? latestVersion;
  if (versionedRegistries.has(v)) {
    return versionedRegistries.get(v)!;
  }
  logger.warn('W-1005', `Schema version "${v}" not found in registry. Falling back to "${latestVersion}".`, { requestedVersion: v });
  return versionedRegistries.get(latestVersion) ?? createEmptyRegistrySet();
}

function resolveFromMap<K extends string, V>(
  map: Map<K, V>,
  key: K | undefined,
  fallbackKey: K,
  category: string
): V | null {
  if (key && map.has(key)) {
    return map.get(key)!;
  }
  if (key) {
    logger.warn('W-1001', `Registry miss for ${category} key "${key}". Falling back to "${fallbackKey}".`, { category, requestedKey: key, fallbackKey });
  }
  return map.get(fallbackKey) ?? null;
}

export function resolveLayout(version: SchemaVersion | undefined, key: LayoutKey | undefined): LayoutRegistration | null {
  return resolveFromMap(getRegistry(version).layouts, key, FALLBACK_DEFAULTS.layout, 'layout');
}

export function resolveSection(version: SchemaVersion | undefined, type: ContentModuleType): SectionRegistration | null {
  const registry = getRegistry(version);
  if (registry.sections.has(type)) {
    return registry.sections.get(type)!;
  }
  logger.warn('W-1001', `No section registered for type "${type}". Skipping.`, { type });
  return null;
}

export function resolveHero(version: SchemaVersion | undefined, key: HeroKey | undefined): HeroRegistration | null {
  return resolveFromMap(getRegistry(version).heroes, key, FALLBACK_DEFAULTS.hero, 'hero');
}

export function resolveGallery(version: SchemaVersion | undefined, key: GalleryKey | undefined): GalleryRegistration | null {
  return resolveFromMap(getRegistry(version).galleries, key, FALLBACK_DEFAULTS.gallery, 'gallery');
}

export function resolveConsole(version: SchemaVersion | undefined, key: ConsoleKey | undefined): ConsoleRegistration | null {
  return resolveFromMap(getRegistry(version).consoles, key, FALLBACK_DEFAULTS.console, 'console');
}

export function resolveCard(version: SchemaVersion | undefined, key: CardKey | undefined): CardRegistration | null {
  return resolveFromMap(getRegistry(version).cards, key, FALLBACK_DEFAULTS.card, 'card');
}

export function resolveAnimation(version: SchemaVersion | undefined, key: AnimationKey | undefined): AnimationRegistration | null {
  return resolveFromMap(getRegistry(version).animations, key, FALLBACK_DEFAULTS.animation, 'animation');
}

export function resolveTheme(version: SchemaVersion | undefined, key: ThemePresetKey | undefined): ThemeRegistration | null {
  return resolveFromMap(getRegistry(version).themes, key, FALLBACK_DEFAULTS.theme, 'theme');
}

export function resolveMediaRenderer(version: SchemaVersion | undefined, type: MediaType): MediaRegistration | null {
  const registry = getRegistry(version);
  if (registry.media.has(type)) {
    return registry.media.get(type)!;
  }
  logger.warn('W-1003', `No media renderer registered for type "${type}". Showing placeholder.`, { type });
  return null;
}

// ─────────────────────────────────────────────
// Manifest Validation
// ─────────────────────────────────────────────

export interface ManifestValidationResult {
  valid: boolean;
  unsupportedModules: ContentModuleType[];
  unsupportedGallery: boolean;
  unsupportedConsole: boolean;
  unsupportedHero: boolean;
  unsupportedTheme: boolean;
}

export function validateAgainstManifest(
  manifest: LayoutManifest,
  requestedModules: ContentModuleType[],
  gallery: GalleryKey,
  console_: ConsoleKey,
  hero: HeroKey,
  theme: ThemePresetKey
): ManifestValidationResult {
  const unsupportedModules = requestedModules.filter(
    (m) => !manifest.supportedModules.includes(m)
  );

  const unsupportedGallery = !manifest.supportedGalleries.includes(gallery);
  const unsupportedConsole = !manifest.supportedConsoles.includes(console_);
  const unsupportedHero = !manifest.supportedHeroes.includes(hero);
  const unsupportedTheme = !manifest.supportedThemes.includes(theme);

  unsupportedModules.forEach((m) => {
    logger.warn('W-1002', `Module "${m}" is not supported by layout "${manifest.key}". It will be skipped.`, {
      layout: manifest.key,
      module: m,
    });
  });

  return {
    valid: unsupportedModules.length === 0 && !unsupportedGallery && !unsupportedConsole && !unsupportedHero && !unsupportedTheme,
    unsupportedModules,
    unsupportedGallery,
    unsupportedConsole,
    unsupportedHero,
    unsupportedTheme,
  };
}

// ─────────────────────────────────────────────
// Introspection (for tests and developer tools)
// ─────────────────────────────────────────────

export function getRegisteredVersions(): SchemaVersion[] {
  return Array.from(versionedRegistries.keys());
}

export function getRegistrySnapshot(version: SchemaVersion): {
  layouts: LayoutKey[];
  sections: ContentModuleType[];
  heroes: HeroKey[];
  galleries: GalleryKey[];
  consoles: ConsoleKey[];
  cards: CardKey[];
  animations: AnimationKey[];
  themes: ThemePresetKey[];
  media: MediaType[];
} | null {
  const reg = versionedRegistries.get(version);
  if (!reg) return null;
  return {
    layouts: Array.from(reg.layouts.keys()),
    sections: Array.from(reg.sections.keys()),
    heroes: Array.from(reg.heroes.keys()),
    galleries: Array.from(reg.galleries.keys()),
    consoles: Array.from(reg.consoles.keys()),
    cards: Array.from(reg.cards.keys()),
    animations: Array.from(reg.animations.keys()),
    themes: Array.from(reg.themes.keys()),
    media: Array.from(reg.media.keys()),
  };
}

/**
 * Clears all registries. For use in tests ONLY.
 */
export function clearAllRegistries(): void {
  versionedRegistries.clear();
}
