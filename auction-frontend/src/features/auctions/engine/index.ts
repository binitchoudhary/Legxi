/**
 * LEGXI Engine — Public Barrel Export
 *
 * All engine infrastructure is exported from this single entry point.
 */

// Domain Types
export * from './types';

// Component Contracts
export * from './contracts';

// Registry (Registration + Resolution)
export {
  registerLayout,
  registerSection,
  registerHero,
  registerGallery,
  registerConsole,
  registerCard,
  registerAnimation,
  registerTheme,
  registerMedia,
  setLatestVersion,
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
} from './registry';
export type { RegistrySet, ManifestValidationResult } from './registry';

// Defaults
export { FALLBACK_DEFAULTS } from './defaults';

// Validator
export {
  validateAuctionConfiguration,
  validateResolvedPage,
} from './validator';
export type { ValidationError, ValidationResult, ValidationSeverity } from './validator';

// Logger
export { logger } from './logger';
export type { LogEntry, LogLevel } from './logger';
