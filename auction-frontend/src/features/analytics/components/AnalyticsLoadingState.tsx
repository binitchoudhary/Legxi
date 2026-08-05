'use client';

import * as React from 'react';
import { LoadingState } from '@/components/admin/LoadingState';

export function AnalyticsLoadingState({ isWidget = false }: { isWidget?: boolean }) {
  return (
    <LoadingState 
      text="Loading analytics data..." 
      className={isWidget ? "min-h-[300px]" : ""}
      data-testid="analytics-loading-state"
    />
  );
}
