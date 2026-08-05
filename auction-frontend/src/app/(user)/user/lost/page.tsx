'use client';

import * as React from 'react';
import { PageContainer } from '@/components/admin/PageContainer';
import { PageHeader } from '@/components/admin/PageHeader';
import { BackendUnavailableState } from '@/components/admin/BackendUnavailableState';

export default function LostAuctionsPage() {
  return (
    <PageContainer>
      <PageHeader 
        title="Lost Auctions" 
        description="Historical view of auctions you participated in but did not win."
      />
      <BackendUnavailableState feature="historical loss data in user endpoints" />
    </PageContainer>
  );
}
