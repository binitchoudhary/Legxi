'use client';

import * as React from 'react';
import { cn } from '@/utils/utils';

interface LegendItem {
  id: string;
  label: string;
  color: string;
}

interface ChartLegendProps {
  items: LegendItem[];
  className?: string;
}

export function ChartLegend({ items, className }: ChartLegendProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-4', className)} data-testid="chart-legend">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <span 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: item.color }} 
            aria-hidden="true"
          />
          <span className="text-sm text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
