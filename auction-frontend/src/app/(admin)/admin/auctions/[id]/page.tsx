'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageContainer } from '@/components/admin/PageContainer';
import { PageHeader } from '@/components/admin/PageHeader';
import { PageToolbar } from '@/components/admin/PageToolbar';
import { AdminCard } from '@/components/admin/AdminCard';
import { MetricCard } from '@/components/admin/MetricCard';
import { StatusBadge, StatusVariant } from '@/components/admin/StatusBadge';
import { Timeline, TimelineEvent } from '@/components/admin/Timeline';
import { AdminTable, Column } from '@/components/admin/AdminTable';
import { useGetAuction } from '@/api/generated/auctions/auctions';
import { useListAuctionBids } from '@/api/generated/bids/bids';
import { Bid } from '@/api/generated/models';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, History, Trophy, User } from 'lucide-react';
import { LoadingState } from '@/components/admin/LoadingState';
import { ErrorState } from '@/components/admin/ErrorState';

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

export default function AuctionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: auctionData, isLoading: isAuctionLoading, isError: isAuctionError, refetch: refetchAuction } = useGetAuction(id);
  const { data: bidsData, isLoading: isBidsLoading } = useListAuctionBids(id, { limit: 50 });

  if (isAuctionLoading) return <LoadingState text="Loading auction details..." />;
  const auctionRes = auctionData?.data;
  if (isAuctionError || !auctionRes || !('success' in auctionRes) || !auctionRes.success) return <ErrorState onRetry={() => refetchAuction()} />;

  const auction = auctionRes.data;
  const bidsRes = bidsData?.data;
  const bids = (bidsRes && 'success' in bidsRes && bidsRes.success) ? bidsRes.data : [];

  const timelineEvents: TimelineEvent[] = [
    {
      id: 'created',
      title: 'Auction Created',
      description: `Version ${auction.version}`,
      timestamp: new Date(auction.createdAt),
      status: 'default',
    },
    {
      id: 'started',
      title: 'Auction Started',
      timestamp: new Date(auction.startTime),
      status: auction.status !== 'DRAFT' ? 'success' : 'default',
    },
  ];

  if (auction.status === 'ENDED' || auction.status === 'SETTLED') {
    timelineEvents.push({
      id: 'ended',
      title: 'Auction Ended',
      description: auction.winningBidId ? `Winner determined: Bid ${auction.winningBidId}` : 'No winner',
      timestamp: new Date(auction.endTime),
      status: 'warning',
    });
  }

  const bidColumns: Column<Bid>[] = [
    {
      id: 'id',
      header: 'Bid ID',
      accessorKey: 'id',
      cell: (row) => <span className="font-mono text-xs">{row.id}</span>
    },
    {
      id: 'userId',
      header: 'User ID',
      accessorKey: 'userId',
      cell: (row) => <span className="font-mono text-xs text-muted-foreground">{row.userId}</span>
    },
    {
      id: 'amount',
      header: 'Amount',
      accessorKey: 'amountPaise',
      cell: (row) => (
        <span className="font-medium text-emerald-600 dark:text-emerald-400">
          ₹{(parseInt(row.amountPaise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: (row) => <StatusBadge status={row.status} variant={row.status === 'WINNING' ? 'success' : row.status === 'REJECTED' ? 'destructive' : 'secondary'} />
    },
    {
      id: 'time',
      header: 'Placed At',
      accessorKey: 'createdAt',
      cell: (row) => <span className="text-sm">{format(new Date(row.createdAt), 'PP p')}</span>
    }
  ];

  const currentPrice = parseInt(auction.currentPricePaise) / 100;

  return (
    <PageContainer>
      <PageToolbar>
        <Button variant="ghost" onClick={() => router.back()} className="-ml-4 gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Auctions
        </Button>
      </PageToolbar>

      <PageHeader 
        title={`Auction ${auction.id.slice(0, 8)}...`}
        description="Detailed view of auction metadata, participants, and bid history. Read-only."
        action={<StatusBadge status={auction.status} variant={statusToVariant(auction.status)} className="text-base px-3 py-1" />}
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard
              title="Current Highest Bid"
              value={`₹${currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              icon={<Trophy className="text-emerald-500" />}
            />
            <MetricCard
              title="Total Participants"
              value={new Set(bids.map(b => b.userId)).size}
              icon={<User />}
            />
          </div>

          <AdminCard title="Bid History" description="Cursor-paginated bid history. Sorted by highest amount.">
            <AdminTable
              columns={bidColumns}
              data={bids}
              isLoading={isBidsLoading}
              emptyTitle="No Bids Yet"
              emptyDescription="No bids have been placed on this auction."
            />
          </AdminCard>
        </div>

        <div className="space-y-6">
          <AdminCard title="Metadata" className="bg-muted/30">
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-muted-foreground font-medium">Product ID</dt>
                <dd className="font-mono mt-1">{auction.shopifyProductId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground font-medium">Start Time</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {format(new Date(auction.startTime), 'PP p')}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground font-medium">End Time</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {format(new Date(auction.endTime), 'PP p')}
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-4">
                <div>
                  <dt className="text-muted-foreground font-medium">Starting Price</dt>
                  <dd>₹{(parseInt(auction.startingPricePaise)/100).toLocaleString('en-IN')}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Increment</dt>
                  <dd>₹{(parseInt(auction.minIncrementPaise)/100).toLocaleString('en-IN')}</dd>
                </div>
              </div>
            </dl>
          </AdminCard>

          <AdminCard title="Timeline">
            <Timeline events={timelineEvents} />
          </AdminCard>
        </div>
      </div>
    </PageContainer>
  );
}
