import React from 'react';
import type { SectionModuleProps } from '../../engine/contracts';

export function AuctionStory({ data }: SectionModuleProps<{ heading?: string; narrative: string }>) {
  return (
    <section className="bg-neutral-900/50 rounded-2xl p-8 border border-neutral-800/50">
      <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-wider">
        {data.heading || 'The Story'}
      </h2>
      <div 
        className="prose prose-invert prose-neutral max-w-none prose-p:text-neutral-400 prose-p:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: data.narrative }}
      />
    </section>
  );
}
