/**
 * LEGXI Fallback Defaults
 *
 * When a registry key cannot be resolved, the system falls back to these
 * safe defaults. No crash, no blank screen — just a predictable UI.
 */

import type {
  LayoutKey,
  HeroKey,
  GalleryKey,
  ConsoleKey,
  CardKey,
  AnimationKey,
  ThemePresetKey,
  SchemaVersion,
} from './types';

export const FALLBACK_DEFAULTS = {
  layout: 'classic' as LayoutKey,
  hero: 'classic' as HeroKey,
  gallery: 'carousel' as GalleryKey,
  console: 'sidebar' as ConsoleKey,
  card: 'flat' as CardKey,
  animation: 'none' as AnimationKey,
  theme: 'gold' as ThemePresetKey,
  schemaVersion: 'v1' as SchemaVersion,
} as const;
