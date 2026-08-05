import React from 'react';
import type { ConsoleProps } from '../../engine/contracts';

export function FloatingConsole({ auction, behavior, themeContext }: ConsoleProps) {
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
      
      {/* Bid State */}
      <div>
        <p className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-2">Current Bid</p>
        <div className="flex items-end gap-3">
          <span className="text-5xl font-extrabold text-white tracking-tight">
            {formatCurrency(auction.current_bid)}
          </span>
          <span className="text-lg text-neutral-500 font-medium mb-1 border border-neutral-800 px-2 py-1 rounded">
            {auction.bid_count} Bids
          </span>
        </div>
      </div>

      {/* Meta info */}
      <div className="flex justify-between items-center text-sm font-medium text-neutral-400 border-t border-neutral-800 pt-4 mt-2">
        <span>{auction.watchers} Watchers</span>
        {behavior.show_reserve && (
          <span className={auction.reserve_met ? "text-green-500" : "text-yellow-500"}>
            {auction.reserve_met ? 'Reserve Met' : 'Reserve Not Met'}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 mt-4">
        <button className="w-full bg-white text-black font-bold text-lg py-4 rounded-xl hover:bg-neutral-200 transition-colors shadow-lg shadow-white/10">
          Place Bid ({formatCurrency(auction.next_valid_bid)})
        </button>
        <button className="w-full bg-neutral-800 text-white font-bold py-3 rounded-xl hover:bg-neutral-700 transition-colors border border-neutral-700">
          Watch Item
        </button>
      </div>

    </div>
  );
}
