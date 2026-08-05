'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/admin/PageContainer';
import { PageHeader } from '@/components/admin/PageHeader';
import { AdminTable, Column } from '@/components/admin/AdminTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { useListAuctions } from '@/api/generated/auctions/auctions';
import { Auction } from '@/api/generated/models';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Gavel } from 'lucide-react';

export default function ActiveAuctionsPage() {
  const router = useRouter();
  
  // As per specification, Active Auctions is driven purely by the backend endpoint without local filtering hack.
  // /auctions?status=ACTIVE is natively supported.
  const { data, isLoading, isError, refetch } = useListAuctions({ limit: 50, status: 'ACTIVE' });
  const auctionsRes = data?.data;
  const activeAuctions = (auctionsRes && 'success' in auctionsRes && auctionsRes.success) ? auctionsRes.data : [];

  const columns: Column<Auction>[] = [
    {
      id: 'id',
      header: 'Auction ID',
      accessorKey: 'id',
      cell: (row) => <span className="font-mono text-xs">{row.id}</span>
    },
    {
      id: 'product',
      header: 'Product',
      accessorKey: 'shopifyProductId',
      cell: (row) => <span className="text-sm font-medium">{row.shopifyProductId}</span>
    },
    {
      id: 'price',
      header: 'Current Price',
      accessorKey: 'currentPricePaise',
      cell: (row) => (
        <span className="font-semibold text-emerald-600">
          ₹{(parseInt(row.currentPricePaise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      id: 'endTime',
      header: 'Ends At',
      accessorKey: 'endTime',
      cell: (row) => <span>{format(new Date(row.endTime), 'PP p')}</span>
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row) => (
        <Button variant="default" size="sm" onClick={() => router.push(`/auction/${row.id}`)}>
          <Gavel className="h-4 w-4 mr-2" />
          Bid Now
        </Button>
      )
    }
  ];

  return (
    <PageContainer>
      <PageHeader 
        title="Active Auctions" 
        description="Browse and participate in live auctions across the platform."
      />

      <AdminTable
        columns={columns}
        data={activeAuctions}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="No Active Auctions"
        emptyDescription="There are currently no live auctions. Please check back later."
      />
    </PageContainer>
  );
}
