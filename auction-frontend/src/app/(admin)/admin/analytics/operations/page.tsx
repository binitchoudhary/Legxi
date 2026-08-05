'use client';

import * as React from 'react';
import { AnalyticsSection } from '@/features/analytics/components/AnalyticsSection';
import { AnalyticsEmptyState } from '@/features/analytics/components/AnalyticsEmptyState';
import { AnalyticsChartContainer } from '@/features/analytics/components/AnalyticsChartContainer';
import { StatTile } from '@/features/analytics/components/StatTile';
import { ServerOff } from 'lucide-react';

export default function AnalyticsOperationsPage() {
  return (
    <div className="space-y-6">
      <AnalyticsSection title="Operations Metrics">
        <div className="grid gap-4 md:grid-cols-3">
          <StatTile
            title="Settlement Success Rate"
            value="Unavailable"
            icon={<ServerOff className="h-4 w-4" />}
          />
          <StatTile
            title="Transfer Success Rate"
            value="Unavailable"
            icon={<ServerOff className="h-4 w-4" />}
          />
          <StatTile
            title="Notification Success Rate"
            value="Unavailable"
            icon={<ServerOff className="h-4 w-4" />}
          />
        </div>
      </AnalyticsSection>

      <div className="grid gap-6 md:grid-cols-2">
        <AnalyticsChartContainer 
          title="Settlement Status" 
          description="Success vs Failed settlements" 
        />
        <AnalyticsChartContainer 
          title="Operations Overview" 
          description="System-wide operational events" 
        />
      </div>

      <AnalyticsSection>
        <AnalyticsEmptyState />
      </AnalyticsSection>
    </div>
  );
}
