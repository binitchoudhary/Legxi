'use client';

import * as React from 'react';
import { PageContainer } from '@/components/admin/PageContainer';
import { PageHeader } from '@/components/admin/PageHeader';
import { DashboardCard } from '@/features/dashboard/components/DashboardCard';
import { StatTile } from '@/features/analytics/components/StatTile';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Gavel, Trophy, Activity, Award, Bell, Settings } from 'lucide-react';
import { AnalyticsEmptyState } from '@/features/analytics/components/AnalyticsEmptyState';

export default function UserDashboardPage() {
  const { user } = useAuthStore();

  return (
    <PageContainer>
      <div className="mb-8 p-6 bg-primary/5 rounded-xl border border-primary/10">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user?.email}</h1>
        <p className="text-muted-foreground mt-1">Here is a summary of your workspace activities.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatTile
          title="Active Auctions"
          value="Unavailable"
          description="Total active across platform"
          icon={<Activity className="text-emerald-500" />}
        />
        <StatTile
          title="My Auctions"
          value="Unavailable"
          description="Auctions you participated in"
          icon={<Gavel />}
        />
        <StatTile
          title="Won Auctions"
          value="Unavailable"
          description="Auctions you have won"
          icon={<Trophy className="text-amber-500" />}
        />
        <StatTile
          title="Unread Notifications"
          value="Unavailable"
          description="Recent alerts"
          icon={<Bell />}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <DashboardCard title="Recent Activity" description="Your latest bidding history">
          <AnalyticsEmptyState isWidget />
        </DashboardCard>
        <DashboardCard title="Quick Actions">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors text-center space-y-2">
              <Gavel className="mx-auto h-6 w-6 text-primary" />
              <div className="text-sm font-medium">Browse Active</div>
            </div>
            <div className="p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors text-center space-y-2">
              <Trophy className="mx-auto h-6 w-6 text-primary" />
              <div className="text-sm font-medium">View Won</div>
            </div>
            <div className="p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors text-center space-y-2">
              <Award className="mx-auto h-6 w-6 text-primary" />
              <div className="text-sm font-medium">Certificates</div>
            </div>
            <div className="p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors text-center space-y-2">
              <Settings className="mx-auto h-6 w-6 text-primary" />
              <div className="text-sm font-medium">Preferences</div>
            </div>
          </div>
        </DashboardCard>
      </div>
    </PageContainer>
  );
}
