'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/admin/PageContainer';
import { PageHeader } from '@/components/admin/PageHeader';
import { AdminTable, Column } from '@/components/admin/AdminTable';
import { StatusBadge, StatusVariant } from '@/components/admin/StatusBadge';
import { SearchBar } from '@/components/admin/SearchBar';
import { useListAuctions } from '@/api/generated/auctions/auctions';
import { Auction } from '@/api/generated/models';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

const statusToVariant = (status: string): StatusVariant => {
  switch (status) {
    case 'ACTIVE': return 'success';
    case 'DRAFT': return 'secondary';
    case 'ENDED': return 'warning';
    case 'SETTLED': return 'default';
    case 'CANCELLED': return 'destructive';
    default: return 'default';
  }
};

export default function AuctionsPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState('');
  
  // Minimal pagination state for demonstration
  const [page, setPage] = React.useState(1);
  const limit = 20;

  const { data, isLoading, isError, refetch } = useListAuctions({ limit });

  // In a real scenario, API would handle search filtering and pagination cursor.
  // We're filtering client-side for demonstration since backend doesn't support 'q' natively in listAuctions yet per spec.
  const auctionsRes = data?.data;
  const allAuctions = (auctionsRes && 'success' in auctionsRes && auctionsRes.success) ? auctionsRes.data : [];
  
  const filteredAuctions = React.useMemo(() => {
    if (!search) return allAuctions;
    const lower = search.toLowerCase();
    return allAuctions.filter(a => 
      a.id.toLowerCase().includes(lower) || 
      a.shopifyProductId.toLowerCase().includes(lower)
    );
  }, [allAuctions, search]);

  const columns: Column<Auction>[] = [
    {
      id: 'id',
      header: 'Auction ID',
      accessorKey: 'id',
      sortable: true,
      cell: (row) => <span className="font-mono text-xs">{row.id}</span>
    },
    {
      id: 'product',
      header: 'Product ID',
      accessorKey: 'shopifyProductId',
      cell: (row) => <span className="font-mono text-xs text-muted-foreground">{row.shopifyProductId}</span>
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (row) => <StatusBadge status={row.status} variant={statusToVariant(row.status)} />
    },
    {
      id: 'price',
      header: 'Current Price',
      accessorKey: 'currentPricePaise',
      cell: (row) => (
        <span>₹{(parseInt(row.currentPricePaise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
      )
    },
    {
      id: 'endTime',
      header: 'Ends At',
      accessorKey: 'endTime',
      sortable: true,
      cell: (row) => <span>{format(new Date(row.endTime), 'PP p')}</span>
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row) => (
        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/auctions/${row.id}`)}>
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
      )
    }
  ];

  return (
    <PageContainer>
      <PageHeader 
        title="Auctions" 
        description="Manage and monitor all platform auctions."
      />

      <div className="flex items-center justify-between mb-2">
        <SearchBar 
          onSearch={(val) => {
            setSearch(val);
            // Sync to URL in a real setup: router.push(`?q=${val}`)
          }} 
          placeholder="Search auctions by ID or Product..." 
        />
      </div>

      <AdminTable
        columns={columns}
        data={filteredAuctions}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="No Auctions Found"
        emptyDescription={search ? "Try adjusting your search criteria." : "No auctions have been created yet."}
        currentPage={page}
        totalPages={1} // Static since we don't have total count from backend response structure
        onPageChange={setPage}
      />
    </PageContainer>
  );
}
