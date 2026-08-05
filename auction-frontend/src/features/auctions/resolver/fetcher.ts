/**
 * LEGXI Resolver — Fetch Layer
 *
 * Implements the IResolverServices using native Next.js fetch()
 * to respect cache policies (revalidate / no-store).
 */

import { IResolverServices, FetchOptions } from './index';
import { AuctionNetworkError, AuctionTimeoutError } from './errors';
import { logger } from '../engine/logger';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function mapCacheOptions(options: FetchOptions): RequestInit {
  if (options.cachePolicy === 'no-store') {
    return { cache: 'no-store' };
  }
  return {
    next: { revalidate: options.revalidateSeconds ?? 60 }
  };
}

async function fetchWithRetry(url: string, options: RequestInit): Promise<any> {
  const delays = [500, 1000, 2000, 4000, 8000];
  const maxRetries = delays.length;

  for (let i = 0; i <= maxRetries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new AuctionNetworkError('E-NET-404', `404 Not Found: ${url}`, 404);
        }
        if (response.status === 401 || response.status === 403) {
          throw new AuctionPermissionError('E-NET-AUTH', `Auth Error: ${url}`, response.status);
        }
        if (response.status >= 500 && i < maxRetries) {
          throw new Error(`5xx Error`); // Caught below to trigger retry
        }
        throw new AuctionNetworkError('E-NET-HTTP', `HTTP Error ${response.status}: ${url}`, response.status);
      }
      return await response.json();
    } catch (err: any) {
      clearTimeout(timeoutId);

      // If it's a domain error we threw intentionally, rethrow
      if (err instanceof AuctionNetworkError || err instanceof AuctionPermissionError) {
        throw err;
      }

      // Handle AbortController Timeout
      if (err.name === 'AbortError') {
        if (i === maxRetries) {
          throw new AuctionTimeoutError('E-NET-TIMEOUT', `Request timed out after 5s: ${url}`);
        }
      } else if (i === maxRetries) {
        // Run out of retries for 5xx or generic network failure
        throw new AuctionNetworkError('E-NET-FAIL', `Fetch failed after retries: ${err.message}`);
      }

      // Wait exponential delay before retrying
      await new Promise(res => setTimeout(res, delays[i]));
    }
  }
}

// Dummy classes for errors that are rethrown above but might not be in scope if not imported properly
// (Will import them at top)
import { AuctionPermissionError } from './errors';

// ─────────────────────────────────────────────
// Concrete Service
// ─────────────────────────────────────────────

export class NextAuctionServices implements IResolverServices {
  constructor(private apiBaseUrl: string) {}

  async fetchResolvedPayload(handle: string, options: FetchOptions): Promise<unknown> {
    const init = mapCacheOptions(options);
    // As per Requirement 1: Frontend calls ONE endpoint.
    return fetchWithRetry(`${this.apiBaseUrl}/auctions/by-product/${handle}`, init);
  }
}
