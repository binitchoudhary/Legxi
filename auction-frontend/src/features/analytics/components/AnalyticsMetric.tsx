'use client';

import * as React from 'react';
import { cn } from '@/utils/utils';
import { AnalyticsLoadingState } from './AnalyticsLoadingState';
import { AnalyticsErrorState } from './AnalyticsErrorState';

interface AnalyticsMetricProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  isLoading?: boolean;
  isError?: boolean;
  className?: string;
}

export function AnalyticsMetric({
  label,
  value,
  trend,
  isLoading,
  isError,
  className,
}: AnalyticsMetricProps) {
  if (isLoading) return <AnalyticsLoadingState />;
  if (isError) return <AnalyticsErrorState />;

  return (
    <div className={cn('flex flex-col space-y-1', className)} data-testid="analytics-metric">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold tracking-tight">{value}</span>
        {trend && (
          <div className="flex items-center text-xs">
            <span
              className={cn('font-medium', {
                'text-emerald-600': trend.direction === 'up',
                'text-destructive': trend.direction === 'down',
                'text-muted-foreground': trend.direction === 'neutral',
              })}
            >
              {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : ''}
              {trend.value}%
            </span>
            {trend.label && <span className="text-muted-foreground ml-1">{trend.label}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
