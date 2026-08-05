import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ImageResolver } from './ImageResolver';
import { CountdownBadge } from './CountdownBadge';
import { Auction } from '@/api/generated/models';
import { useShopifyProduct } from '@/hooks/useShopifyProduct';

export interface HeroProps {
  auction?: Auction | null;
}

function formatPrice(paise: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function Hero({ auction }: HeroProps) {
  const { data: productMeta } = useShopifyProduct(auction?.shopifyProductId || '');

  // If we have a dynamic auction, show it. Otherwise show a generic brand hero.
  const imageUrl = productMeta?.imageUrl || productMeta?.image || null;
  const title = productMeta?.title || 'MATCH-WORN ARGENTINA WORLD CUP FINAL SHIRT 2022';
  const subtitle = productMeta?.player || 'Authentic Collectible';
  const price = auction ? formatPrice(Number(auction.currentPricePaise)) : '₹12,00,000';
  const lotLabel = auction ? `LOT #${auction.id.slice(-6).toUpperCase()}` : 'FEATURED LOT';

  return (
    <div className="relative w-full min-h-[90vh] md:min-h-[100vh] flex items-end overflow-hidden bg-[#050505]">
      
      {/* Background Image / Texture Layer */}
      <div className="absolute inset-0 z-0">
         <ImageResolver 
           src={imageUrl} 
           alt="Premium Collectible Hero" 
           priority
           className="opacity-70 object-cover w-full h-full scale-105"
         />
         {/* Deep gradient overlay to ensure text is perfectly legible */}
         <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent"></div>
         <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/80 via-transparent to-transparent"></div>
      </div>
      
      {/* Content */}
      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-16 pb-24 lg:pb-32 w-full flex flex-col md:flex-row md:items-end md:justify-between gap-12">
        
        {/* Left Side: Product Info */}
        <div className="flex flex-col items-start max-w-3xl">
          <div className="inline-flex items-center rounded-sm bg-black/40 backdrop-blur-md px-3 py-1 text-xs font-mono tracking-[0.2em] uppercase text-white/80 border border-white/10 mb-6">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-3 animate-pulse"></span>
            {lotLabel}
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif text-white leading-[1.1] tracking-tight mb-4 drop-shadow-2xl uppercase">
            {title}
          </h1>
          
          <p className="text-lg md:text-2xl text-white/70 tracking-widest font-sans font-light uppercase mb-6">
            {subtitle}
          </p>

          <div className="text-sm md:text-base text-white/50 font-light leading-relaxed max-w-xl border-l-2 border-primary/50 pl-4 mb-8">
            An exceptionally rare piece of sporting history, acquired directly from the estate and authenticated on-chain. This is your opportunity to secure a legacy asset.
          </div>
        </div>
        
        {/* Right Side: Action Panel */}
        <div className="flex flex-col items-start md:items-end min-w-[300px]">
          <div className="mb-2 text-sm text-white/60 tracking-widest uppercase font-sans">
            Current Bid
          </div>
          <div className="text-4xl md:text-5xl font-sans font-semibold text-white mb-8 tracking-tight">
            {price}
          </div>
          
          <Link href={auction ? `/auctions/${auction.id}` : '/auctions'}>
            <Button size="lg" className="h-[60px] px-12 text-sm tracking-[0.15em] uppercase font-bold text-[#050505] bg-primary border-none rounded-none hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] transition-all duration-300">
              Secure This Piece
            </Button>
          </Link>
          
          {auction?.status === 'ACTIVE' && (
            <div className="mt-6">
              <div className="text-xs text-white/40 tracking-[0.2em] uppercase mb-2">Closes In</div>
              <CountdownBadge 
                endTime={auction.endTime} 
                status={auction.status} 
                variant="card"
                className="bg-black/60 backdrop-blur-md px-4 py-2 shadow-lg border border-white/10 text-sm font-mono tracking-wider text-primary"
              />
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
