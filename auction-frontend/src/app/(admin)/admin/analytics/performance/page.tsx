'use client';

import * as React from 'react';
import { AnalyticsSection } from '@/features/analytics/components/AnalyticsSection';
import { AnalyticsEmptyState } from '@/features/analytics/components/AnalyticsEmptyState';
import { AnalyticsChartContainer } from '@/features/analytics/components/AnalyticsChartContainer';
import { StatTile } from '@/features/analytics/components/StatTile';
import { ServerOff } from 'lucide-react';

export default function AnalyticsPerformancePage() {
  return (
    <div className="space-y-6">
      <AnalyticsSection title="Performance Metrics">
        <div className="grid gap-4 md:grid-cols-3">
          <StatTile
            title="Average Bids per Auction"
            value="Unavailable"
            icon={<ServerOff className="h-4 w-4" />}
          />
          <StatTile
            title="Auction Growth"
            value="Unavailable"
            icon={<ServerOff className="h-4 w-4" />}
          />
          <StatTile
            title="Highest Bid All Time"
            value="Unavailable"
            icon={<ServerOff className="h-4 w-4" />}
          />
        </div>
      </AnalyticsSection>

      <AnalyticsChartContainer 
        title="Participant Engagement" 
        description="Bids mapped across auction lifecycles" 
      />

      <AnalyticsSection>
        <AnalyticsEmptyState />
      </AnalyticsSection>
    </div>
  );
}
