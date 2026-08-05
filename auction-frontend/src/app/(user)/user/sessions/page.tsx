'use client';

import * as React from 'react';
import { PageContainer } from '@/components/admin/PageContainer';
import { PageHeader } from '@/components/admin/PageHeader';
import { BackendUnavailableState } from '@/components/admin/BackendUnavailableState';

export default function SessionsPage() {
  return (
    <PageContainer>
      <PageHeader 
        title="Active Sessions" 
        description="Monitor and revoke active logins across devices."
      />
      <BackendUnavailableState feature="active sessions" />
    </PageContainer>
  );
}
