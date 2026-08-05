import React from 'react';
import type { SectionModuleProps } from '../../engine/contracts';

interface TimelineEvent {
  date: string;
  description: string;
}

interface TimelineData {
  timeline_title?: string;
  timeline_events: TimelineEvent[];
}

export function TimelineSection({ data }: SectionModuleProps<TimelineData>) {
  if (!data.timeline_events || data.timeline_events.length === 0) return null;

  return (
    <section>
      <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider pl-4 border-l-2 border-white">
        {data.timeline_title || 'Timeline'}
      </h2>
      <div className="relative border-l border-neutral-800 ml-4 pl-8 space-y-12">
        {data.timeline_events.map((evt, idx) => (
          <div key={idx} className="relative">
            {/* Timeline node */}
            <div className="absolute w-3 h-3 bg-white rounded-full -left-[38px] top-1.5 border-4 border-black" />
            
            <div className="text-sm font-bold text-neutral-500 tracking-widest mb-1 uppercase">
              {evt.date}
            </div>
            <div className="text-lg text-neutral-300">
              {evt.description}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
