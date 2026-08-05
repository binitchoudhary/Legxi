'use client';

import * as React from 'react';
import { AnalyticsSection } from '@/features/analytics/components/AnalyticsSection';
import { AnalyticsEmptyState } from '@/features/analytics/components/AnalyticsEmptyState';
import { AnalyticsChartContainer } from '@/features/analytics/components/AnalyticsChartContainer';
import { StatTile } from '@/features/analytics/components/StatTile';
import { ServerOff } from 'lucide-react';

export default function AnalyticsRevenuePage() {
  return (
    <div className="space-y-6">
      <AnalyticsSection title="Revenue Metrics">
        <div className="grid gap-4 md:grid-cols-3">
          <StatTile
            title="Settled Revenue"
            value="Unavailable"
            icon={<ServerOff className="h-4 w-4" />}
          />
          <StatTile
            title="Pending Revenue"
            value="Unavailable"
            icon={<ServerOff className="h-4 w-4" />}
          />
          <StatTile
            title="Refunded Revenue"
            value="Unavailable"
            icon={<ServerOff className="h-4 w-4" />}
          />
        </div>
      </AnalyticsSection>

      <AnalyticsChartContainer 
        title="Revenue Breakdown" 
        description="Detailed revenue distribution" 
      />

      <AnalyticsSection>
        <AnalyticsEmptyState />
      </AnalyticsSection>
    </div>
  );
}
