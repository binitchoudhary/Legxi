'use client';

import * as React from 'react';
import { PageContainer } from '@/components/admin/PageContainer';
import { PageHeader } from '@/components/admin/PageHeader';
import { BackendUnavailableState } from '@/components/admin/BackendUnavailableState';

export default function MyAuctionsPage() {
  return (
    <PageContainer>
      <PageHeader 
        title="My Auctions" 
        description="View your active participation and bidding history."
      />
      <BackendUnavailableState feature="user-specific auction history" />
    </PageContainer>
  );
}
