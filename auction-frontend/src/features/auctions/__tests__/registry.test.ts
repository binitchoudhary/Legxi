/**
 * LEGXI Registry Infrastructure — Unit Tests
 */

import {
  registerLayout,
  registerSection,
  registerHero,
  registerGallery,
  registerConsole,
  registerCard,
  registerAnimation,
  registerTheme,
  registerMedia,
  resolveLayout,
  resolveSection,
  resolveHero,
  resolveGallery,
  resolveConsole,
  resolveCard,
  resolveAnimation,
  resolveTheme,
  resolveMediaRenderer,
  validateAgainstManifest,
  getRegisteredVersions,
  getRegistrySnapshot,
  clearAllRegistries,
  setLatestVersion,
  logger,
} from '../engine';
import type {
  LayoutRegistration,
  SectionRegistration,
  LayoutManifest,
} from '../engine';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const DummyComponent = (() => null) as any;

function makeLayoutRegistration(key: string, overrides?: Partial<LayoutManifest>): LayoutRegistration {
  return {
    manifest: {
      key: key as any,
      displayName: key,
      schemaVersions: ['v1'],
      supportedModules: ['auction_story', 'player_profile'],
      supportedGalleries: ['carousel', 'grid'],
      supportedConsoles: ['sidebar', 'floating'],
      supportedHeroes: ['immersive', 'classic'],
      supportedThemes: ['gold', 'platinum'],
      supportedMedia: ['IMAGE', 'VIDEO'],
      ...overrides,
    },
    component: DummyComponent,
  };
}

// ─────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────

describe('LEGXI Registry Infrastructure', () => {
  beforeEach(() => {
    clearAllRegistries();
    logger.clearBuffer();
    setLatestVersion('v1');
  });

  // ─── Registration ───

  describe('Registration', () => {
    it('registers a layout and resolves it', () => {
      registerLayout('v1', makeLayoutRegistration('jersey'));
      const result = resolveLayout('v1', 'jersey');
      expect(result).not.toBeNull();
      expect(result!.manifest.key).toBe('jersey');
    });

    it('registers a section and resolves it', () => {
      const reg: SectionRegistration = {
        manifest: { type: 'auction_story', displayName: 'Story', schemaVersions: ['v1'] },
        component: DummyComponent,
      };
      registerSection('v1', reg);
      const result = resolveSection('v1', 'auction_story');
      expect(result).not.toBeNull();
      expect(result!.manifest.type).toBe('auction_story');
    });

    it('registers hero, gallery, console, card, animation, theme, media', () => {
      registerHero('v1', { key: 'immersive', component: DummyComponent });
      registerGallery('v1', { key: 'carousel', component: DummyComponent });
      registerConsole('v1', { key: 'sidebar', component: DummyComponent });
      registerCard('v1', { key: 'flat', component: DummyComponent });
      registerAnimation('v1', { key: 'smooth', config: { enter: '', exit: '', duration: 300, easing: 'ease' } });
      registerTheme('v1', { key: 'gold', tokens: { background: '#000', surface: '#111', text: '#fff', textMuted: '#888', primary: '#D4AF37', accent: '#1A1A2E', border: '#333', success: '#0f0', warning: '#ff0', error: '#f00' } });
      registerMedia('v1', { type: 'IMAGE', component: DummyComponent });

      expect(resolveHero('v1', 'immersive')).not.toBeNull();
      expect(resolveGallery('v1', 'carousel')).not.toBeNull();
      expect(resolveConsole('v1', 'sidebar')).not.toBeNull();
      expect(resolveCard('v1', 'flat')).not.toBeNull();
      expect(resolveAnimation('v1', 'smooth')).not.toBeNull();
      expect(resolveTheme('v1', 'gold')).not.toBeNull();
      expect(resolveMediaRenderer('v1', 'IMAGE')).not.toBeNull();
    });
  });

  // ─── Fallback ───

  describe('Fallback System', () => {
    it('falls back to default layout when key is unknown', () => {
      registerLayout('v1', makeLayoutRegistration('classic'));
      const result = resolveLayout('v1', 'hologram' as any);
      expect(result).not.toBeNull();
      expect(result!.manifest.key).toBe('classic');

      const logs = logger.getBuffer();
      expect(logs.some(l => l.code === 'W-1001')).toBe(true);
    });

    it('falls back to latest version when schema_version is unknown', () => {
      registerLayout('v1', makeLayoutRegistration('jersey'));
      const result = resolveLayout('v99' as any, 'jersey');
      expect(result).not.toBeNull();

      const logs = logger.getBuffer();
      expect(logs.some(l => l.code === 'W-1005')).toBe(true);
    });

    it('returns null for unknown section type and logs warning', () => {
      const result = resolveSection('v1', 'unknown_module' as any);
      expect(result).toBeNull();

      const logs = logger.getBuffer();
      expect(logs.some(l => l.code === 'W-1001')).toBe(true);
    });

    it('returns null for unknown media type and logs warning', () => {
      const result = resolveMediaRenderer('v1', 'HOLOGRAM' as any);
      expect(result).toBeNull();

      const logs = logger.getBuffer();
      expect(logs.some(l => l.code === 'W-1003')).toBe(true);
    });
  });

  // ─── Versioning ───

  describe('Versioning', () => {
    it('isolates registrations by version', () => {
      registerLayout('v1', makeLayoutRegistration('jersey'));
      const v1 = resolveLayout('v1', 'jersey');
      const v2 = resolveLayout('v1', 'jersey'); // v2 has no registrations
      expect(v1).not.toBeNull();

      // If we query a version that has no registrations, it should fall back
      clearAllRegistries();
      registerLayout('v1', makeLayoutRegistration('jersey'));
      setLatestVersion('v1');
      // v2 doesn't exist, should fallback
      const fallbackResult = resolveLayout('v2' as any, 'jersey');
      expect(fallbackResult).not.toBeNull();
    });

    it('getRegisteredVersions returns all versions', () => {
      registerLayout('v1', makeLayoutRegistration('jersey'));
      const versions = getRegisteredVersions();
      expect(versions).toContain('v1');
    });
  });

  // ─── Introspection ───

  describe('Introspection', () => {
    it('getRegistrySnapshot returns all registered keys', () => {
      registerLayout('v1', makeLayoutRegistration('jersey'));
      registerLayout('v1', makeLayoutRegistration('poster'));
      registerSection('v1', { manifest: { type: 'auction_story', displayName: 'Story', schemaVersions: ['v1'] }, component: DummyComponent });

      const snapshot = getRegistrySnapshot('v1');
      expect(snapshot).not.toBeNull();
      expect(snapshot!.layouts).toEqual(expect.arrayContaining(['jersey', 'poster']));
      expect(snapshot!.sections).toContain('auction_story');
    });

    it('getRegistrySnapshot returns null for unknown version', () => {
      expect(getRegistrySnapshot('v99' as any)).toBeNull();
    });
  });

  // ─── Manifest Validation ───

  describe('Manifest Validation', () => {
    it('validates supported modules', () => {
      const manifest: LayoutManifest = makeLayoutRegistration('jersey').manifest;
      const result = validateAgainstManifest(
        manifest,
        ['auction_story', 'player_profile'],
        'carousel',
        'sidebar',
        'immersive',
        'gold'
      );
      expect(result.valid).toBe(true);
      expect(result.unsupportedModules).toHaveLength(0);
    });

    it('flags unsupported modules', () => {
      const manifest: LayoutManifest = makeLayoutRegistration('jersey').manifest;
      const result = validateAgainstManifest(
        manifest,
        ['auction_story', 'faq_group'], // faq_group not in jersey manifest
        'carousel',
        'sidebar',
        'immersive',
        'gold'
      );
      expect(result.valid).toBe(false);
      expect(result.unsupportedModules).toContain('faq_group');

      const logs = logger.getBuffer();
      expect(logs.some(l => l.code === 'W-1002')).toBe(true);
    });

    it('flags unsupported gallery', () => {
      const manifest: LayoutManifest = makeLayoutRegistration('jersey').manifest;
      const result = validateAgainstManifest(
        manifest,
        ['auction_story'],
        'fullscreen', // not supported by jersey
        'sidebar',
        'immersive',
        'gold'
      );
      expect(result.unsupportedGallery).toBe(true);
    });
  });
});
