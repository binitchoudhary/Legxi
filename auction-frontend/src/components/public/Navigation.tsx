'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, X, User } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth() as any;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#050505]/90 backdrop-blur-md border-b border-white/5 py-4' : 'bg-transparent py-6'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" className="text-2xl font-serif text-white tracking-widest uppercase">
            LEGXI
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-xs font-sans tracking-[0.15em] uppercase text-white/70 hover:text-white transition-colors">
              The Collection
            </Link>
            <Link href="/story" className="text-xs font-sans tracking-[0.15em] uppercase text-white/70 hover:text-white transition-colors">
              Our Story
            </Link>
            
            {/* Auctions Dropdown (CSS Hover) */}
            <div className="relative group">
              <button className="text-xs font-sans tracking-[0.15em] uppercase text-white/70 group-hover:text-white transition-colors flex items-center gap-1 py-2">
                Auctions
                <svg className="w-3 h-3 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              <div className="absolute top-full left-0 mt-0 w-48 bg-[#0a0a0a] border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-50">
                <Link href="/auctions?status=ACTIVE" className="block px-4 py-3 text-xs font-sans tracking-[0.15em] uppercase text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                  Live Auctions
                </Link>
                <Link href="/auctions?status=UPCOMING" className="block px-4 py-3 text-xs font-sans tracking-[0.15em] uppercase text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                  Upcoming
                </Link>
                <Link href="/auctions?status=ENDED" className="block px-4 py-3 text-xs font-sans tracking-[0.15em] uppercase text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                  Past Auctions
                </Link>
                <Link href="/hall-of-fame" className="block px-4 py-3 text-xs font-sans tracking-[0.15em] uppercase text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                  Hall of Fame
                </Link>
              </div>
            </div>
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-6">
            <button className="text-white/70 hover:text-white transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <div className="w-px h-4 bg-white/20"></div>
            {user ? (
              <Link href={user.role === 'ADMIN' || user.role === 'OPERATOR' ? '/admin/dashboard' : '/user/dashboard'} className="flex items-center gap-2 text-xs font-sans tracking-[0.1em] uppercase text-primary hover:text-white transition-colors">
                <User className="w-4 h-4" />
                Vault
              </Link>
            ) : (
              <Link href="/login" className="text-xs font-sans tracking-[0.1em] uppercase text-white hover:text-primary transition-colors">
                Collector Access
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <span className="text-xs font-sans tracking-widest uppercase">Menu</span>}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-[72px] bg-[#050505] z-40 flex flex-col p-6 border-t border-white/5 overflow-y-auto">
          <nav className="flex flex-col gap-8 mt-4">
            <Link href="/" className="text-xl font-serif text-white tracking-widest uppercase" onClick={() => setMobileMenuOpen(false)}>
              The Collection
            </Link>
            <Link href="/story" className="text-xl font-serif text-white tracking-widest uppercase" onClick={() => setMobileMenuOpen(false)}>
              Our Story
            </Link>

            <div className="flex flex-col gap-4 pl-4 border-l border-white/10 mt-2">
              <span className="text-sm font-sans tracking-[0.2em] text-primary uppercase">Auctions</span>
              <Link href="/auctions?status=ACTIVE" className="text-lg font-serif text-white/80 tracking-widest uppercase" onClick={() => setMobileMenuOpen(false)}>
                Live Auctions
              </Link>
              <Link href="/auctions?status=UPCOMING" className="text-lg font-serif text-white/80 tracking-widest uppercase" onClick={() => setMobileMenuOpen(false)}>
                Upcoming
              </Link>
              <Link href="/auctions?status=ENDED" className="text-lg font-serif text-white/80 tracking-widest uppercase" onClick={() => setMobileMenuOpen(false)}>
                Past Auctions
              </Link>
              <Link href="/hall-of-fame" className="text-lg font-serif text-white/80 tracking-widest uppercase" onClick={() => setMobileMenuOpen(false)}>
                Hall of Fame
              </Link>
            </div>

            <div className="w-full h-px bg-white/10 my-4"></div>
            {user ? (
              <Link href={user.role === 'ADMIN' || user.role === 'OPERATOR' ? '/admin/dashboard' : '/user/dashboard'} className="text-lg font-sans text-primary tracking-widest uppercase" onClick={() => setMobileMenuOpen(false)}>
                Collector Vault
              </Link>
            ) : (
              <Link href="/login" className="text-lg font-sans text-primary tracking-widest uppercase" onClick={() => setMobileMenuOpen(false)}>
                Collector Access
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
