'use client';

import * as React from 'react';
import { PageContainer } from '@/components/admin/PageContainer';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState } from '@/components/admin/EmptyState';
import { ServerOff } from 'lucide-react';

export default function SettlementsPage() {
  return (
    <PageContainer>
      <PageHeader 
        title="Settlements" 
        description="Monitor and manage auction settlements."
      />
      <EmptyState
        title="Backend API Unavailable"
        description="Current RC1 backend does not expose Settlement endpoints. No client-side workaround has been implemented."
        icon={ServerOff}
        className="bg-card"
      />
    </PageContainer>
  );
}
