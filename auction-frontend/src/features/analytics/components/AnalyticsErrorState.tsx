'use client';

import * as React from 'react';
import { ErrorState } from '@/components/admin/ErrorState';

interface AnalyticsErrorStateProps {
  onRetry?: () => void;
  isWidget?: boolean;
}

export function AnalyticsErrorState({ onRetry, isWidget = false }: AnalyticsErrorStateProps) {
  return (
    <ErrorState
      title="Failed to load analytics"
      description="An error occurred while communicating with the analytics service."
      onRetry={onRetry}
      className={isWidget ? "min-h-[300px]" : ""}
      data-testid="analytics-error-state"
    />
  );
}
