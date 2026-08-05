'use client';

import * as React from 'react';
import { PageContainer } from '@/components/admin/PageContainer';
import { PageHeader } from '@/components/admin/PageHeader';
import { BackendUnavailableState } from '@/components/admin/BackendUnavailableState';

export default function WonAuctionsPage() {
  return (
    <PageContainer>
      <PageHeader 
        title="Won Auctions" 
        description="View auctions you have won and their settlement status."
      />
      <BackendUnavailableState feature="winner information in auction metadata" />
    </PageContainer>
  );
}
