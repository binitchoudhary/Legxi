'use client';

import * as React from 'react';
import { ServerOff } from 'lucide-react';
import { EmptyState } from '@/components/admin/EmptyState';
import { cn } from '@/utils/utils';

interface BackendUnavailableStateProps {
  feature?: string;
  className?: string;
}

export function BackendUnavailableState({ feature, className }: BackendUnavailableStateProps) {
  return (
    <EmptyState
      title="Backend API Unavailable"
      description={
        feature 
          ? `Backend API does not currently expose ${feature}. No client-side workaround has been implemented.`
          : "Current RC1 backend does not expose these endpoints. No client-side workaround has been implemented."
      }
      icon={ServerOff}
      className={cn("bg-card border-none min-h-[400px]", className)}
      data-testid="backend-unavailable"
    />
  );
}
