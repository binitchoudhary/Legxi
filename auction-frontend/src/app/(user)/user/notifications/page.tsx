'use client';

import * as React from 'react';
import { PageContainer } from '@/components/admin/PageContainer';
import { PageHeader } from '@/components/admin/PageHeader';
import { BackendUnavailableState } from '@/components/admin/BackendUnavailableState';

export default function NotificationsPage() {
  return (
    <PageContainer>
      <PageHeader 
        title="Notifications" 
        description="System alerts and auction updates."
      />
      <BackendUnavailableState feature="notification history" />
    </PageContainer>
  );
}
