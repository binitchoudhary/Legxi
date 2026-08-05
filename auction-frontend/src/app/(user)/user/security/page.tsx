'use client';

import * as React from 'react';
import { PageContainer } from '@/components/admin/PageContainer';
import { PageHeader } from '@/components/admin/PageHeader';
import { BackendUnavailableState } from '@/components/admin/BackendUnavailableState';

export default function SecurityPage() {
  return (
    <PageContainer>
      <PageHeader 
        title="Security" 
        description="Manage your account security and trusted devices."
      />
      <BackendUnavailableState feature="security settings" />
    </PageContainer>
  );
}
