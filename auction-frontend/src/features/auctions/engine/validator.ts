/**
 * LEGXI Configuration Validator
 *
 * Runs before the Dynamic Renderer mounts anything.
 * If validation fails with severity 'error', the renderer shows a
 * "Merchant Configuration Error" page instead of a broken UI.
 */

import type {
  AuctionConfiguration,
  ResolvedAuctionPage,
  ContentModule,
  SchemaVersion,
} from './types';
import {
  LAYOUT_KEYS,
  HERO_KEYS,
  GALLERY_KEYS,
  CONSOLE_KEYS,
  CARD_KEYS,
  ANIMATION_KEYS,
  THEME_PRESET_KEYS,
  USER_ROLES,
  AUCTION_LIFECYCLE,
} from './types';

// ─────────────────────────────────────────────
// Validation Result
// ─────────────────────────────────────────────

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationError {
  code: string;
  field: string;
  message: string;
  severity: ValidationSeverity;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function push(
  errors: ValidationError[],
  code: string,
  field: string,
  message: string,
  severity: ValidationSeverity
): void {
  errors.push({ code, field, message, severity });
}

function isValidEnum<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

// ─────────────────────────────────────────────
// Core Validator
// ─────────────────────────────────────────────

export function validateAuctionConfiguration(config: AuctionConfiguration): ValidationResult {
  const issues: ValidationError[] = [];

  // Schema version
  if (!config.schema_version) {
    push(issues, 'E-2001', 'schema_version', 'Missing schema_version. Cannot determine registry version.', 'error');
  }

  // Visual config
  if (!config.visual) {
    push(issues, 'E-2004', 'visual', 'Missing visual configuration domain.', 'error');
  } else {
    if (!isValidEnum(config.visual.layout, LAYOUT_KEYS)) {
      push(issues, 'E-2002', 'visual.layout', `Invalid layout key: "${config.visual.layout}".`, 'error');
    }
    if (!isValidEnum(config.visual.hero, HERO_KEYS)) {
      push(issues, 'E-2002', 'visual.hero', `Invalid hero key: "${config.visual.hero}".`, 'warning');
    }
    if (!isValidEnum(config.visual.gallery, GALLERY_KEYS)) {
      push(issues, 'E-2002', 'visual.gallery', `Invalid gallery key: "${config.visual.gallery}".`, 'warning');
    }
    if (!isValidEnum(config.visual.console, CONSOLE_KEYS)) {
      push(issues, 'E-2002', 'visual.console', `Invalid console key: "${config.visual.console}".`, 'warning');
    }
    if (!isValidEnum(config.visual.card, CARD_KEYS)) {
      push(issues, 'E-2002', 'visual.card', `Invalid card key: "${config.visual.card}".`, 'warning');
    }
    if (!isValidEnum(config.visual.animation, ANIMATION_KEYS)) {
      push(issues, 'E-2002', 'visual.animation', `Invalid animation key: "${config.visual.animation}".`, 'warning');
    }
  }

  // Behavior config
  if (!config.behavior) {
    push(issues, 'E-2004', 'behavior', 'Missing behavior configuration domain.', 'error');
  }

  // Permission config
  if (!config.permissions) {
    push(issues, 'E-2004', 'permissions', 'Missing permission configuration domain.', 'error');
  } else {
    if (!isValidEnum(config.permissions.min_role_to_view, USER_ROLES)) {
      push(issues, 'E-2003', 'permissions.min_role_to_view', `Invalid role: "${config.permissions.min_role_to_view}".`, 'error');
    }
    if (!isValidEnum(config.permissions.min_role_to_bid, USER_ROLES)) {
      push(issues, 'E-2003', 'permissions.min_role_to_bid', `Invalid role: "${config.permissions.min_role_to_bid}".`, 'error');
    }
    // Role hierarchy check: min_role_to_bid must be >= min_role_to_view
    const roleIndex = (r: string) => USER_ROLES.indexOf(r as any);
    if (config.permissions.min_role_to_bid && config.permissions.min_role_to_view) {
      if (roleIndex(config.permissions.min_role_to_bid) < roleIndex(config.permissions.min_role_to_view)) {
        push(issues, 'E-2003', 'permissions', 'min_role_to_bid cannot be lower than min_role_to_view.', 'error');
      }
    }
  }

  // Theme config
  if (!config.theme) {
    push(issues, 'E-2004', 'theme', 'Missing theme configuration domain.', 'warning');
  } else {
    if (!isValidEnum(config.theme.theme_preset, THEME_PRESET_KEYS)) {
      push(issues, 'E-2002', 'theme.theme_preset', `Invalid theme preset: "${config.theme.theme_preset}".`, 'warning');
    }
  }

  // Feature flags (optional, but should exist)
  if (!config.feature_flags) {
    push(issues, 'E-2004', 'feature_flags', 'Missing feature flags domain.', 'warning');
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ─────────────────────────────────────────────
// Full Page Validator
// ─────────────────────────────────────────────

export function validateResolvedPage(page: ResolvedAuctionPage): ValidationResult {
  const issues: ValidationError[] = [];

  // Product
  if (!page.product) {
    push(issues, 'E-2004', 'product', 'Missing Shopify product data.', 'error');
  } else {
    if (!page.product.handle) {
      push(issues, 'E-2004', 'product.handle', 'Missing product handle.', 'error');
    }
    if (!page.product.media || page.product.media.length === 0) {
      push(issues, 'E-2004', 'product.media', 'Product has no media. Gallery cannot render.', 'warning');
    }
  }

  // Auction state
  if (!page.auction) {
    push(issues, 'E-2004', 'auction', 'Missing auction state.', 'error');
  } else {
    if (!isValidEnum(page.auction.status, AUCTION_LIFECYCLE)) {
      push(issues, 'E-2004', 'auction.status', `Invalid lifecycle state: "${page.auction.status}".`, 'error');
    }
  }

  // Configuration
  const configResult = validateAuctionConfiguration(page.configuration);
  issues.push(...configResult.errors, ...configResult.warnings);

  // Content modules
  if (page.content_modules && page.content_modules.length > 0) {
    const seenOrders = new Set<number>();
    for (const mod of page.content_modules) {
      if (seenOrders.has(mod.order)) {
        push(issues, 'E-2004', `content_modules[${mod.order}]`, `Duplicate order index ${mod.order}.`, 'warning');
      }
      seenOrders.add(mod.order);
    }
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
