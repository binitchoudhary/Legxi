'use client';

import { useEffect } from 'react';

/**
 * Merchant Configuration Error Boundary
 *
 * This catches AuctionResolverError thrown by the resolver due to invalid
 * configuration or backend payloads, preventing a React crash and displaying
 * actionable information to the merchant.
 */
export default function AuctionErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string; code?: string; zerr?: unknown };
  reset: () => void;
}) {
  useEffect(() => {
    // We already log during resolution, but we can also log the boundary catch
    console.error('Auction Boundary Caught:', error);
  }, [error]);

  const isConfigurationError = error.name === 'AuctionResolverError';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-black text-white">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 p-8 rounded-xl shadow-2xl text-center">
        <div className="w-16 h-16 bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold mb-2">Merchant Configuration Error</h2>
        
        <p className="text-neutral-400 mb-6 text-sm leading-relaxed">
          The auction configuration for this product is incomplete or invalid.
          Please check the Shopify Admin and verify the LEGXI Metaobjects.
        </p>

        {isConfigurationError && (
          <div className="text-left bg-black p-4 rounded text-xs font-mono text-red-400 overflow-auto mb-6 max-h-32">
            Code: {error.code || 'E-UNKNOWN'}<br />
            Message: {error.message}
          </div>
        )}

        <button
          onClick={() => reset()}
          className="w-full py-3 px-4 bg-white text-black font-semibold rounded hover:bg-neutral-200 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
