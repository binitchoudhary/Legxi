/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useListAuctions } from '@/api/generated/auctions/auctions';
import { AuctionGrid } from '@/components/public/AuctionGrid';
import { AuctionCard } from '@/components/public/AuctionCard';
import { AuctionGridSkeleton } from '@/components/public/Skeletons';
import { ErrorState } from '@/components/public/ErrorState';
import { SearchBar } from '@/components/public/SearchBar';
import { FilterDrawer } from '@/components/public/FilterDrawer';
import { Footer } from '@/components/public/Footer';

export default function PublicAuctionsPage() {
  const [status, setStatus] = useState<string>('ALL');
  const { data, isLoading, isError, refetch } = useListAuctions({ limit: 50 });
  const auctionsRes = data?.data;
  let auctions = (auctionsRes && 'success' in auctionsRes && auctionsRes.success) ? auctionsRes.data : [];

  if (status !== 'ALL') {
    auctions = auctions.filter(a => a.status === status);
  }

  const handleFilterChange = (filters: { status?: string }) => {
    if (filters.status) setStatus(filters.status);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050505]">
      
      {/* Sleek Header Banner */}
      <div className="bg-[#0a0a0a] border-b border-white/5 py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-7xl">
           <h1 className="text-4xl md:text-5xl font-serif text-white tracking-tight mb-4">Live Auctions</h1>
           <p className="text-white/60 font-light text-lg">Acquire authenticated, match-worn sports artifacts directly from the source.</p>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 max-w-7xl py-12">
        
        {/* Filter and Search Bar - Premium dark styling */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 pb-6 border-b border-white/5">
          <div className="text-sm font-medium tracking-[0.2em] uppercase text-white/50">
            {isLoading ? 'Loading Catalog...' : `${auctions.length} LOTS AVAILABLE`}
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <SearchBar onSearch={(_q) => {}} className="flex-1 md:w-72 bg-[#0a0a0a] border-white/10" />
            <FilterDrawer onFilterChange={handleFilterChange} />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && <AuctionGridSkeleton count={12} />}
        
        {/* Error State */}
        {isError && <ErrorState onRetry={() => refetch()} className="my-12 border border-white/5 bg-[#0a0a0a] rounded-2xl" />}
        
        {/* Graceful Empty State Inside the Grid */}
        {!isLoading && !isError && auctions.length === 0 && (
          <div>
            <div className="mb-12 text-center p-12 border border-white/5 bg-[#0a0a0a]/50 rounded-2xl backdrop-blur-sm">
               <h3 className="text-2xl font-serif text-white mb-3">No Active Lots Match Your Criteria</h3>
               <p className="text-white/50 font-light">Try adjusting your filters or browse our upcoming collections below.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 opacity-60">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className="aspect-[4/5] rounded-2xl bg-[#0a0a0a] border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
                     <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-30"></div>
                     <span className="text-primary font-serif italic text-xl mb-2">Upcoming Lot</span>
                     <span className="text-[10px] tracking-[0.2em] uppercase text-white/30">Cataloging</span>
                  </div>
                ))}
            </div>
          </div>
        )}
        
        {/* Populated Grid */}
        {!isLoading && !isError && auctions.length > 0 && (
          <AuctionGrid>
            {auctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} productMeta={(auction as any).product} />
            ))}
          </AuctionGrid>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
