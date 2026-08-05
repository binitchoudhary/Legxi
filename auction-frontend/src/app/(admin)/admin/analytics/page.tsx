'use client';

import * as React from 'react';
import { AnalyticsSection } from '@/features/analytics/components/AnalyticsSection';
import { AnalyticsEmptyState } from '@/features/analytics/components/AnalyticsEmptyState';
import { AnalyticsChartContainer } from '@/features/analytics/components/AnalyticsChartContainer';
import { StatTile } from '@/features/analytics/components/StatTile';
import { ServerOff } from 'lucide-react';

export default function AnalyticsOverviewPage() {
  return (
    <div className="space-y-6">
      <AnalyticsSection title="Key Metrics">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatTile
            title="Total Revenue"
            value="Unavailable"
            icon={<ServerOff className="h-4 w-4" />}
          />
          <StatTile
            title="Completed Auctions"
            value="Unavailable"
            icon={<ServerOff className="h-4 w-4" />}
          />
          <StatTile
            title="Total Bids"
            value="Unavailable"
            icon={<ServerOff className="h-4 w-4" />}
          />
          <StatTile
            title="Highest Bid"
            value="Unavailable"
            icon={<ServerOff className="h-4 w-4" />}
          />
        </div>
      </AnalyticsSection>

      <div className="grid gap-6 md:grid-cols-2">
        <AnalyticsChartContainer 
          title="Revenue Trend" 
          description="Gross revenue over the selected period" 
        />
        <AnalyticsChartContainer 
          title="Auction Performance" 
          description="Active vs Completed auctions" 
        />
      </div>

      <AnalyticsSection>
        <AnalyticsEmptyState />
      </AnalyticsSection>
    </div>
  );
}
