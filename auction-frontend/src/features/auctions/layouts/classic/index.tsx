import React from 'react';
import type { LayoutProps } from '../../engine/contracts';

export function ClassicLayout({
  heroSlot,
  gallerySlot,
  consoleSlot,
  children,
  themeContext
}: LayoutProps) {
  // We can use themeContext.primary_color for accenting
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-neutral-800">
      
      {/* Header Spacer / Navbar space */}
      <header className="h-16 border-b border-neutral-900 flex items-center px-6">
        <span className="text-xl font-bold tracking-widest text-white">LEGXI</span>
      </header>

      {/* Main Product Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column (Gallery) */}
          <div className="lg:col-span-7 flex flex-col gap-8">
            <div className="rounded-xl overflow-hidden bg-neutral-950 border border-neutral-900 aspect-square relative">
              {gallerySlot || (
                <div className="absolute inset-0 flex items-center justify-center text-neutral-600">
                  Gallery Placeholder
                </div>
              )}
            </div>
            
            {/* Mobile Hero & Console (Shown under gallery on mobile, hidden on lg) */}
            <div className="block lg:hidden space-y-8">
              {heroSlot}
              {consoleSlot}
            </div>

            {/* Content Modules Area */}
            <div className="mt-8 space-y-16">
              {children && React.Children.count(children) > 0 ? (
                children
              ) : (
                <div className="py-12 text-center text-neutral-500 border border-dashed border-neutral-800 rounded-lg">
                  No content modules available.
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Sticky Console & Hero) */}
          <div className="hidden lg:block lg:col-span-5 relative">
            <div className="sticky top-24 flex flex-col gap-8">
              {heroSlot}
              {consoleSlot}
            </div>
          </div>

        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-neutral-900 mt-24 py-12 text-center text-neutral-600">
        <p>&copy; {new Date().getFullYear()} LEGXI Auctions.</p>
      </footer>
    </div>
  );
}
