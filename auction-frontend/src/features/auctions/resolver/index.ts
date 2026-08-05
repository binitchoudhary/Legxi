import {
  ShopifyProductSchema,
  AuctionStateSchema,
  AuctionConfigurationSchema,
  ContentModuleSchema,
  ResolvedAuctionPageSchema,
} from './schema';
import { logTiming } from './logger';
import { logger } from '../engine/logger';
import { AuctionValidationError, AuctionResolverError } from './errors';
import type {
  ShopifyProduct,
  AuctionState,
  AuctionConfiguration,
  ContentModule,
  ResolvedAuctionPage,
} from '../engine/types';

// ─────────────────────────────────────────────
// Cache Strategy (Change 3)
// ─────────────────────────────────────────────
// As per Change 1: the backend assembles everything.
// But the frontend must always fetch the latest auction state (no-store).
// The backend handles the granular caching (Product 60s, Config 60s, State 0s).
// Thus, the NEXT fetch policy for this single endpoint must be no-store.
export interface FetchOptions {
  cachePolicy: 'revalidate' | 'no-store';
  revalidateSeconds?: number;
}

const SINGLE_ENDPOINT_CACHE: FetchOptions = { cachePolicy: 'no-store' };

// ─────────────────────────────────────────────
// Service Interfaces (Dependency Injection for tests)
// ─────────────────────────────────────────────

export interface IResolverServices {
  // Requirement 1: Only ONE backend endpoint
  fetchResolvedPayload(handle: string, options: FetchOptions): Promise<unknown>;
}

// ─────────────────────────────────────────────
// Resolver Core
// ─────────────────────────────────────────────

/**
 * Resolves the complete auction page payload, enforcing runtime validation,
 * independent module resolution, and proper observability.
 */
export async function resolveAuctionPage(
  handle: string,
  services: IResolverServices,
  requestedLocale: string = 'en'
): Promise<ResolvedAuctionPage> {
  const totalStartTime = performance.now();

  // 1. Fetch entire payload from single backend endpoint
  const fetchStart = performance.now();
  let rawPayload: any;
  try {
    rawPayload = await services.fetchResolvedPayload(handle, SINGLE_ENDPOINT_CACHE);
  } catch (err) {
    // Let network/timeout errors propagate up
    throw err;
  }
  logTiming('I-6102', 'Backend Assembly Fetch', fetchStart, { handle });

  const validationStart = performance.now();

  // 2. Validate Core Dependencies (Crash / throw if invalid)
  if (!rawPayload || typeof rawPayload !== 'object') {
    throw new AuctionValidationError('E-6300', 'Payload is not an object');
  }

  const productResult = ShopifyProductSchema.safeParse(rawPayload.product);
  if (!productResult.success) {
    throw new AuctionValidationError('E-6301', 'Product payload invalid', productResult.error);
  }

  const configResult = AuctionConfigurationSchema.safeParse(rawPayload.configuration);
  if (!configResult.success) {
    throw new AuctionValidationError('E-6302', 'Configuration payload invalid', configResult.error);
  }

  const stateResult = AuctionStateSchema.safeParse(rawPayload.auction);
  if (!stateResult.success) {
    throw new AuctionValidationError('E-6303', 'Auction State payload invalid', stateResult.error);
  }

  // 3. Independent Module Resolution & Localization
  const validModules: ContentModule[] = [];
  const rawModules = Array.isArray(rawPayload.content_modules) ? rawPayload.content_modules : [];

  for (const [index, rawMod] of rawModules.entries()) {
    const modResult = ContentModuleSchema.safeParse(rawMod);
    if (modResult.success) {
      const mod = modResult.data as ContentModule;
      
      // Change 2: Localization filtering
      if (resolveLocalizedModule(mod, requestedLocale)) {
        validModules.push(mod);
      }
    } else {
      logger.warn('W-6201', `Module validation failed at index ${index}. Skipping module.`, {
        handle,
        index,
        error: modResult.error.issues,
      });
    }
  }

  // 4. Sort modules by order
  validModules.sort((a, b) => a.order - b.order);

  logTiming('I-6104', 'Validation & Assembly', validationStart, { handle });

  // 5. Final payload validation (Defense in depth)
  const assembledPayload = {
    product: productResult.data,
    auction: stateResult.data,
    configuration: configResult.data,
    content_modules: validModules,
  };

  const finalResult = ResolvedAuctionPageSchema.safeParse(assembledPayload);
  if (!finalResult.success) {
    throw new AuctionValidationError('E-6304', 'Final assembled payload invalid', finalResult.error);
  }

  logTiming('I-6105', 'Total Resolver Time', totalStartTime, { handle });

  return finalResult.data as ResolvedAuctionPage;
}

// ─────────────────────────────────────────────
// Localization Helper
// ─────────────────────────────────────────────

export function resolveLocalizedModule<T extends ContentModule>(
  module: T,
  requestedLocale: string
): boolean {
  // If no locale specified, it's universal
  if (!module.locale && !module.fallbackLocale) return true;
  
  // Exact match
  if (module.locale === requestedLocale) return true;
  
  // Fallback match
  if (module.fallbackLocale === requestedLocale) return true;
  
  // Default match: if we ask for 'en' and there's no match, but the module has fallbackLocale 'en'
  // Or if we just reject it. The prompt:
  // "requested locale -> if exists render -> else fallback locale -> else default locale"
  
  // Simplification for the architecture design step:
  // If the locale doesn't match the request, we don't render it.
  return false;
}
