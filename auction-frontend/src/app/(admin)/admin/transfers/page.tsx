'use client';

import * as React from 'react';
import { PageContainer } from '@/components/admin/PageContainer';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState } from '@/components/admin/EmptyState';
import { ServerOff } from 'lucide-react';

export default function TransfersPage() {
  return (
    <PageContainer>
      <PageHeader 
        title="Transfers" 
        description="Monitor ownership transfers."
      />
      <EmptyState
        title="Backend API Unavailable"
        description="Current RC1 backend does not expose Transfer endpoints. No client-side workaround has been implemented."
        icon={ServerOff}
        className="bg-card"
      />
    </PageContainer>
  );
}
