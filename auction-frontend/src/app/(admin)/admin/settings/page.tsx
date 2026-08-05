'use client';

import * as React from 'react';
import { PageContainer } from '@/components/admin/PageContainer';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState } from '@/components/admin/EmptyState';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader 
        title="Settings" 
        description="Platform configuration and preferences."
      />
      <EmptyState
        title="Coming Soon"
        description="Settings management is scheduled for a future release."
        icon={Settings}
        className="bg-card"
      />
    </PageContainer>
  );
}
