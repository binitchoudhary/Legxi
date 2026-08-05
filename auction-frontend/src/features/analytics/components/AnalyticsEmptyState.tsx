'use client';

import * as React from 'react';
import { ServerOff } from 'lucide-react';
import { EmptyState } from '@/components/admin/EmptyState';
import { cn } from '@/utils/utils';

interface AnalyticsEmptyStateProps {
  className?: string;
  isWidget?: boolean;
}

export function AnalyticsEmptyState({ className, isWidget = false }: AnalyticsEmptyStateProps) {
  return (
    <EmptyState
      title="Backend API Unavailable"
      description="Current RC1 backend does not expose analytics endpoints. No client-side workaround has been implemented."
      icon={ServerOff}
      className={cn("bg-card", isWidget && "min-h-[300px] border-none p-4 bg-transparent", className)}
      data-testid="analytics-empty-state"
    />
  );
}
