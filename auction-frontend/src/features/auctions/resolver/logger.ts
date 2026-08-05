import { logger } from '../engine/logger';

/**
 * Resolver-specific observability functions to record timing
 * and cache hits/misses.
 */

export function logTiming(
  code: string,
  operation: string,
  startTimeMs: number,
  context?: Record<string, unknown>
): void {
  const durationMs = performance.now() - startTimeMs;
  logger.info(code, `${operation} took ${durationMs.toFixed(2)}ms`, {
    ...context,
    durationMs,
  });
}

// ─────────────────────────────────────────────
// Resolver Observability Codes
// ─────────────────────────────────────────────
// I-6101 Shopify Fetch
// I-6102 Backend Config Fetch
// I-6103 Backend Modules Fetch
// I-6104 Resolver Merge & Validation
// I-6105 Total Render Time
//
// W-6201 Module validation failed (module skipped)
// W-6202 Module fetch failed (module skipped)
//
// E-6301 Schema validation failed for Product
// E-6302 Schema validation failed for Auction Config
// E-6303 Schema validation failed for Auction State
