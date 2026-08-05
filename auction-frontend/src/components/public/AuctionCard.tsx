'use client';

import Link from 'next/link';
import { Auction } from '@/api/generated/models';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImageResolver } from './ImageResolver';
import { CountdownBadge } from './CountdownBadge';
import { PriceCard } from './PriceCard';
import { cn } from '@/utils/utils';
import { ShieldCheck, Eye, Activity } from 'lucide-react';
import { useShopifyProduct } from '@/hooks/useShopifyProduct';

export interface AuctionCardProps {
  auction: Auction;
  productMeta?: {
    title?: string;
    imageUrl?: string | null;
    player?: string;
    team?: string;
    sport?: string;
  };
  className?: string;
}

export function AuctionCard({ auction, productMeta: initialProductMeta, className }: AuctionCardProps) {
  const { data: fetchedProductMeta } = useShopifyProduct(auction.shopifyProductId);
  
  // Use fetched meta if available, fallback to initial, otherwise use ID
  const productMeta = fetchedProductMeta || initialProductMeta;
  
  // Mock counts since API doesn't provide them in list endpoint yet
  // In production, backend should return these aggregations
  const bidsCount = auction.id.length % 5 + 3; // Deterministic demo data
  const watchCount = auction.id.length % 15 + 12; // Deterministic demo data

  return (
    <Link href={`/auctions/${auction.id}`} className={cn("block group relative", className)}>
      <Card className="overflow-hidden border-none bg-transparent shadow-none hover:shadow-2xl transition-all duration-700">
        
        {/* Edge-to-Edge Image Area */}
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#0a0a0a] rounded-t-2xl">
          <ImageResolver 
            src={productMeta?.imageUrl || productMeta?.image} 
            alt={productMeta?.title || `Auction ${auction.id}`} 
            className="smooth-zoom group-hover:scale-110 opacity-90 group-hover:opacity-100"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>
          
          <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
            {auction.status === 'ACTIVE' && (
              <Badge variant="default" className="uppercase tracking-widest text-[9px] py-1 px-3 bg-red-600/90 text-white border-none animate-pulse">
                ● LIVE
              </Badge>
            )}
            {auction.status !== 'ACTIVE' && (
              <Badge variant="secondary" className="uppercase tracking-widest text-[9px] py-1 px-3">
                {auction.status}
              </Badge>
            )}
          </div>
          
          <div className="absolute top-4 right-4 z-10">
             <div className="bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/10 shadow-lg flex items-center gap-2 group-hover:bg-primary/20 transition-colors">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-[9px] font-bold tracking-widest uppercase text-white/80">Auth</span>
             </div>
          </div>
          
          <div className="absolute bottom-4 left-4 right-4 z-10 flex justify-between items-end">
            <div className="flex gap-3">
              <div className="flex flex-col items-center justify-center bg-black/60 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10 shadow-lg">
                <Activity className="w-3 h-3 text-primary mb-0.5" />
                <span className="text-[10px] font-mono text-white/80">{bidsCount} BIDS</span>
              </div>
              <div className="flex flex-col items-center justify-center bg-black/60 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10 shadow-lg">
                <Eye className="w-3 h-3 text-primary mb-0.5" />
                <span className="text-[10px] font-mono text-white/80">{watchCount} WATCH</span>
              </div>
            </div>
            
            <CountdownBadge 
              endTime={auction.endTime} 
              status={auction.status} 
              variant="card"
              className="bg-black/80 backdrop-blur-md px-3 py-2 shadow-[0_0_15px_rgba(212,175,55,0.15)] rounded-lg border border-primary/20 text-xs font-mono tracking-wider text-primary"
            />
          </div>
        </div>

        {/* Content Area - Dark Slate */}
        <CardContent className="p-6 bg-[#141414] rounded-b-2xl border border-white/5 border-t-0">
          <div className="flex flex-wrap gap-2 mb-3 items-center">
            {productMeta?.vendor ? (
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{productMeta.vendor}</span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Premium Lot</span>
            )}
            <span className="w-1 h-1 rounded-full bg-border"></span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
              LOT #{auction.id.slice(-6)}
            </span>
          </div>
          
          <h3 className="font-serif text-xl md:text-2xl leading-tight mb-6 line-clamp-2 text-white group-hover:text-primary transition-colors duration-300 min-h-[3.5rem]">
            {productMeta?.title || `Authentic Collectible`}
          </h3>
          
          <div className="pt-5 border-t border-white/10 flex justify-between items-end">
            <PriceCard currentPricePaise={auction.currentPricePaise} />
            <span className="text-xs uppercase tracking-widest text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
              View Lot →
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
