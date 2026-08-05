/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Hero } from '@/components/public/Hero';
import { Footer } from '@/components/public/Footer';
import { SectionHeader } from '@/components/public/SectionHeader';
import { AuctionGrid } from '@/components/public/AuctionGrid';
import { AuctionCard } from '@/components/public/AuctionCard';
import { AuctionGridSkeleton } from '@/components/public/Skeletons';
import { ErrorState } from '@/components/public/ErrorState';
import { useListAuctions } from '@/api/generated/auctions/auctions';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const { data, isLoading, isError, refetch } = useListAuctions({ limit: 4 });
  const auctionsRes = data?.data;
  const auctions = (auctionsRes && 'success' in auctionsRes && auctionsRes.success) ? auctionsRes.data : [];

  // Determine highest bid active auction for the Mega Hero
  const activeAuctions = auctions.filter((a) => a.status === 'ACTIVE');
  const heroAuction = activeAuctions.length > 0 
    ? [...activeAuctions].sort((a, b) => Number(b.currentPricePaise) - Number(a.currentPricePaise))[0]
    : (auctions.length > 0 ? auctions[0] : null);

  return (
    <main className="flex flex-col min-h-screen bg-[#050505]">
      <Hero auction={heroAuction} />
      
      <div className="w-full relative py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-16 max-w-7xl">
          
          {/* Ending Soon / Curated Collection */}
          <section className="mb-40">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16">
               <SectionHeader 
                 title="Ending Soon" 
                 subtitle="The latest authenticated artifacts approaching the hammer."
                 actionHref="/auctions"
               />
            </div>
            
            {isLoading && <AuctionGridSkeleton count={4} />}
            {isError && <ErrorState onRetry={() => refetch()} />}
            
            {!isLoading && !isError && auctions.length === 0 && (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Graceful Premium Empty State Cards */}
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="aspect-[3/4] rounded-2xl bg-[#0a0a0a] border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">
                       <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50"></div>
                       <span className="text-primary font-serif italic text-xl mb-2">Upcoming Lot</span>
                       <span className="text-[10px] tracking-[0.2em] uppercase text-white/40">Details Pending</span>
                    </div>
                  ))}
               </div>
            )}
            
            {!isLoading && !isError && auctions.length > 0 && (
              <AuctionGrid>
                {auctions.map((auction) => (
                  <AuctionCard key={auction.id} auction={auction} productMeta={(auction as any).product} />
                ))}
              </AuctionGrid>
            )}
          </section>

          {/* The Standard (Trust Block) - 50/50 Split */}
          <section className="relative mb-40 border-t border-white/5 pt-32">
            <div className="grid md:grid-cols-2 gap-16 lg:gap-24 items-center">
               
               {/* Left: Text & Story */}
               <div>
                 <div className="inline-flex items-center text-xs font-mono tracking-[0.2em] uppercase text-primary mb-6">
                   <ShieldCheck className="w-4 h-4 mr-2" />
                   The LEGXI Standard
                 </div>
                 
                 <h2 className="text-4xl md:text-5xl font-serif text-white leading-tight mb-8">
                   Absolute Trust.<br/>
                   Cryptographically Secured.
                 </h2>
                 
                 <p className="text-lg text-white/60 font-light leading-relaxed mb-8">
                   Every physical asset is authenticated by industry experts, bonded to a tamper-proof NFC tag, and registered permanently on an immutable digital ledger.
                 </p>
                 
                 <div className="space-y-6 mb-12">
                   <div className="flex items-start">
                     <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 mr-4 flex-shrink-0"></div>
                     <p className="text-white/80 font-light">Directly sourced from players, clubs, and verified collectors.</p>
                   </div>
                   <div className="flex items-start">
                     <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 mr-4 flex-shrink-0"></div>
                     <p className="text-white/80 font-light">Independent verification of match-worn status and provenance.</p>
                   </div>
                   <div className="flex items-start">
                     <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 mr-4 flex-shrink-0"></div>
                     <p className="text-white/80 font-light">Digital Certificate of Authenticity acts as your permanent receipt.</p>
                   </div>
                 </div>
                 
                 <Link href="/authentication" className="group inline-flex items-center text-sm font-medium tracking-[0.15em] uppercase text-white hover:text-primary transition-colors">
                   Read the Methodology <ArrowRight className="ml-3 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                 </Link>
               </div>
               
               {/* Right: Graphic / Visual */}
               <div className="relative aspect-square md:aspect-[4/5] rounded-2xl overflow-hidden bg-gradient-to-br from-[#111] to-[#050505] border border-white/10 flex items-center justify-center p-12">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50"></div>
                 
                 {/* Abstract Hologram / NFC Representation */}
                 <div className="relative w-full max-w-sm aspect-square rounded-full border border-primary/20 flex items-center justify-center shadow-[0_0_100px_rgba(212,175,55,0.05)]">
                   <div className="w-3/4 aspect-square rounded-full border border-primary/40 flex items-center justify-center">
                     <div className="w-1/2 aspect-square rounded-full border border-primary/60 flex items-center justify-center">
                       <ShieldCheck className="w-16 h-16 text-primary drop-shadow-[0_0_15px_rgba(212,175,55,0.8)]" />
                     </div>
                   </div>
                 </div>
                 
               </div>
            </div>
          </section>

          {/* Upcoming Auctions Section */}
          <section className="mb-40 pt-24 border-t border-white/5">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16">
               <SectionHeader 
                 title="Upcoming Lots" 
                 subtitle="Preview extraordinary artifacts before they hit the block."
                 actionHref="/auctions?status=UPCOMING"
               />
            </div>
            
            {!isLoading && !isError && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Fallback Empty States if no upcoming auctions exist yet */}
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="aspect-[3/4] rounded-2xl bg-[#0a0a0a] border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">
                     <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50"></div>
                     <span className="text-primary font-serif italic text-xl mb-2">Upcoming Lot</span>
                     <span className="text-[10px] tracking-[0.2em] uppercase text-white/40">Details Pending</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Hall of Fame Section */}
          <section className="mb-24 pt-32 border-t border-white/5">
            <div className="flex flex-col items-center text-center mb-16">
               <h2 className="text-4xl md:text-5xl font-serif text-white leading-tight mb-6">
                 Hall of Fame
               </h2>
               <p className="text-white/60 mb-8 max-w-xl mx-auto font-light text-lg">
                 View historic hammer prices and discover the ultimate pieces of sports history secured by LEGXI collectors.
               </p>
               <Link href="/hall-of-fame" className="group inline-flex items-center justify-center px-8 py-4 border border-white/20 rounded-none text-sm font-medium tracking-[0.15em] uppercase text-white hover:border-primary hover:text-primary transition-all">
                 Enter the Vault <ArrowRight className="ml-3 w-4 h-4 group-hover:translate-x-1 transition-transform" />
               </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Mock Hall of Fame Items */}
              {[1, 2, 3].map(i => (
                <div key={i} className="aspect-square bg-[#111] rounded-2xl border border-white/10 relative overflow-hidden group flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/60 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-6 text-center">
                    <span className="text-primary text-xs font-mono tracking-widest uppercase mb-2">Final Hammer</span>
                    <span className="text-3xl font-serif text-white mb-4">₹45,00,000</span>
                    <span className="text-xs text-white/60 uppercase tracking-widest">Secured by VIP Collector</span>
                  </div>
                  <span className="text-white/20 font-serif italic text-2xl z-0">Artifact 0{i}</span>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
      
      <Footer />
    </main>
  );
}
