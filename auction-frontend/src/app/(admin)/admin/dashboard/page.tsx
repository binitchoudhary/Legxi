'use client';

import * as React from 'react';
import { PageContainer } from '@/components/admin/PageContainer';
import { PageHeader } from '@/components/admin/PageHeader';
import { PageSection } from '@/components/admin/PageSection';
import { MetricCard } from '@/components/admin/MetricCard';
import { SystemHealth } from './_components/SystemHealth';
import { useListAuctions } from '@/api/generated/auctions/auctions';
import { Gavel, Activity, AlertCircle, CheckCircle2, TrendingUp, Search } from 'lucide-react';
import { FeatureGuard } from '@/features/auth/components/FeatureGuard';

export default function DashboardPage() {
  const { data: auctionsData, isLoading } = useListAuctions({ limit: 100 });
  const auctionsRes = auctionsData?.data;
  const auctions = (auctionsRes && 'success' in auctionsRes && auctionsRes.success) ? auctionsRes.data : [];
  
  const totalAuctions = auctions.length;
  const activeAuctions = auctions.filter(a => a.status === 'ACTIVE').length;
  const closedAuctions = auctions.filter(a => a.status === 'SETTLED' || a.status === 'ENDED').length;
  const upcomingAuctions = auctions.filter(a => a.status === 'DRAFT').length;

  return (
    <FeatureGuard featureFlag="admin_dashboard">
      <PageContainer>
        <PageHeader 
          title="Dashboard" 
          description="Overview of auction operations and system health."
        />

        <PageSection title="Auction Metrics">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Auctions"
              value={totalAuctions}
              icon={<Gavel />}
              isLoading={isLoading}
            />
            <MetricCard
              title="Active Auctions"
              value={activeAuctions}
              icon={<Activity className="text-emerald-500" />}
              isLoading={isLoading}
            />
            <MetricCard
              title="Upcoming Auctions"
              value={upcomingAuctions}
              icon={<AlertCircle className="text-amber-500" />}
              isLoading={isLoading}
            />
            <MetricCard
              title="Closed Auctions"
              value={closedAuctions}
              icon={<CheckCircle2 className="text-muted-foreground" />}
              isLoading={isLoading}
            />
          </div>
        </PageSection>

        <PageSection title="Bid Metrics">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Bids"
              value="Unavailable"
              icon={<TrendingUp />}
              isError={true} // Marked as unavailable per spec
            />
            <MetricCard
              title="Highest Bid Today"
              value="Unavailable"
              icon={<Search />}
              isError={true} // Marked as unavailable per spec
            />
          </div>
        </PageSection>

        <div className="grid gap-4 md:grid-cols-2">
          <PageSection title="Infrastructure">
            <SystemHealth />
          </PageSection>
        </div>
      </PageContainer>
    </FeatureGuard>
  );
}
