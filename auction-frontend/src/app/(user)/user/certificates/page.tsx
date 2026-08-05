'use client';

import * as React from 'react';
import { PageContainer } from '@/components/admin/PageContainer';
import { PageHeader } from '@/components/admin/PageHeader';
import { BackendUnavailableState } from '@/components/admin/BackendUnavailableState';

export default function CertificatesPage() {
  return (
    <PageContainer>
      <PageHeader 
        title="Certificates" 
        description="View your digital certificates of authenticity for won items."
      />
      <BackendUnavailableState feature="certificate history" />
    </PageContainer>
  );
}
