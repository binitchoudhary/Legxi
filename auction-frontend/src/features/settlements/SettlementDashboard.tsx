'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { SettlementTimeline } from './components/SettlementTimeline';
import { ActionPanel } from './components/ActionPanel';
import { useSettlementViewModel } from './hooks/useSettlementViewModel';
import { Card, CardContent } from '@/components/ui/card';

export default function SettlementDashboard({ auctionId }: { auctionId: string }) {
  const { auction, isLoading } = useSettlementViewModel(auctionId);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading Settlement Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settlement: Auction {auction?.id?.substring(0, 8) || '...'}</h1>
        <p className="text-muted-foreground mt-2">Manage your post-auction payment and ownership transfer for Auction {auction?.id}.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Timeline */}
        <div className="lg:col-span-4">
          <SettlementTimeline auctionId={auctionId} />
        </div>

        {/* Right Column: Action Panel & Auction Details */}
        <div className="lg:col-span-8 space-y-8">
          <ActionPanel auctionId={auctionId} />
          
          <Card>
            <CardContent className="p-6 flex gap-6 items-center">
              <div className="w-32 h-32 bg-secondary rounded-md flex items-center justify-center text-muted-foreground">
                [Image]
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <dt className="text-muted-foreground font-medium">Product ID</dt>
                  <dd className="font-mono mt-1">{auction?.shopifyProductId || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Ended At</dt>
                  <dd className="mt-1">{auction?.endTime ? format(new Date(auction.endTime), 'PP p') : 'N/A'}</dd>
                </div>
              </div>
              <div className="ml-auto flex gap-2">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">Verified Authentic</span>
                <span className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm font-medium">Insured Delivery</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
