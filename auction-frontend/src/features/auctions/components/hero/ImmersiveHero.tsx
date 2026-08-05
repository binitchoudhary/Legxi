import React from 'react';
import type { HeroProps } from '../../engine/contracts';

export function ImmersiveHero({ product, auction, themeContext }: HeroProps) {
  // Use product title, auction current bid for a clean hero
  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-950/50 text-red-500 rounded-full text-xs font-bold uppercase tracking-widest border border-red-900/50 w-max">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        Live Auction
      </div>
      
      <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
        {product.title}
      </h1>
      
      <p className="text-lg text-neutral-400 max-w-2xl">
        Presented by {product.vendor}
      </p>

      <div className="h-px w-full bg-neutral-900 my-4" />
    </div>
  );
}
