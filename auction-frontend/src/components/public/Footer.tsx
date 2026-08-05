import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full border-t border-white/5 bg-[#050505]">
      <div className="container mx-auto px-4 py-16 md:py-24 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-16">
          <div className="space-y-6 md:col-span-1">
            <h3 className="text-2xl font-serif text-white tracking-widest uppercase">LEGXI</h3>
            <p className="text-sm text-white/50 font-light leading-relaxed">
              The premier destination for authenticated sports collectibles and match-worn memorabilia.
            </p>
          </div>
          
          <div>
            <h4 className="font-sans text-xs tracking-[0.2em] uppercase text-white/80 mb-6">Marketplace</h4>
            <ul className="space-y-4 text-sm text-white/50 font-light">
              <li><Link href="/auctions" className="hover:text-primary transition-colors">Live Auctions</Link></li>
              <li><Link href="/auctions?status=UPCOMING" className="hover:text-primary transition-colors">Upcoming Lots</Link></li>
              <li><Link href="/auctions?status=ENDED" className="hover:text-primary transition-colors">Past Results</Link></li>
              <li><Link href="/hall-of-fame" className="hover:text-primary transition-colors">Hall of Fame</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-sans text-xs tracking-[0.2em] uppercase text-white/80 mb-6">Support</h4>
            <ul className="space-y-4 text-sm text-white/50 font-light">
              <li><a href="/how-it-works" className="hover:text-primary transition-colors">How to Bid</a></li>
              <li><a href="/authentication" className="hover:text-primary transition-colors">Authentication</a></li>
              <li><a href="/shipping" className="hover:text-primary transition-colors">Shipping & Returns</a></li>
              <li><a href="/contact" className="hover:text-primary transition-colors">Contact Us</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-sans text-xs tracking-[0.2em] uppercase text-white/80 mb-6">Legal</h4>
            <ul className="space-y-4 text-sm text-white/50 font-light">
              <li><a href="/terms" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="/cookies" className="hover:text-primary transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs text-white/40 font-mono tracking-widest uppercase">
            © {new Date().getFullYear()} LEGXI AUCTIONS. ALL RIGHTS RESERVED.
          </p>
          <div className="flex gap-4">
            {/* Social Icons would go here */}
          </div>
        </div>
      </div>
    </footer>
  );
}
