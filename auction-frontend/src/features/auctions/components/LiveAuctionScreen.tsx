'use client';

import * as React from 'react';
import { useSocketConnectionManager } from '@/socket/hooks/useSocketConnectionManager';
import { useLiveAuctionStore } from '../store/useLiveAuctionStore';
import { BidPlacementForm } from './BidPlacementForm';
import { BidFeed } from './BidFeed';
import { CountdownTimer } from './CountdownTimer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGetAuction } from '@/api/generated/auctions/auctions';
import { useShopifyProduct } from '@/hooks/useShopifyProduct';

export const LiveAuctionScreen = ({ auctionId }: { auctionId: string }) => {
  // Bind socket manager to the lifecycle of this screen
  useSocketConnectionManager(auctionId);

  const { connectionState, presence, winnerDeclared, status: liveStatus, currentPricePaise } = useLiveAuctionStore();
  
  // Hydrate base metadata
  const { data: baseData, isLoading } = useGetAuction(auctionId);
  const auctionRes = baseData?.data;
  const auction = (auctionRes && 'success' in auctionRes && auctionRes.success) ? auctionRes.data : undefined;

  const { data: productMeta } = useShopifyProduct(auction?.shopifyProductId || '');

  if (isLoading || !auction) {
    return <div className="p-8 text-center animate-pulse">Loading Live Experience...</div>;
  }

  const currentPrice = currentPricePaise || auction.currentPricePaise;
  const status = liveStatus || auction.status;
  const displayAmount = Number(currentPrice) / 100;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 max-w-7xl mx-auto">
      {/* Left Column: Details & Bidding */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <div>
              <CardTitle className="text-3xl font-bold">{productMeta?.title || `Lot #${auction.id.slice(-6)}`}</CardTitle>
              <div className="text-sm text-muted-foreground flex gap-4 mt-2">
                <Badge variant={connectionState === 'LIVE' ? 'default' : 'destructive'}>
                  {connectionState}
                </Badge>
                {winnerDeclared && <Badge variant="secondary">SETTLEMENT PENDING</Badge>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground uppercase tracking-wider">Remaining Time</div>
              <CountdownTimer />
            </div>
          </CardHeader>
          <CardContent>
            <div className="my-8">
              <div className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Current Highest Bid</div>
              <div className="text-5xl font-black">${displayAmount.toFixed(2)}</div>
            </div>

            {!winnerDeclared && status === 'ACTIVE' ? (
              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Place Your Bid</h3>
                <BidPlacementForm auctionId={auctionId} />
              </div>
            ) : (
              <div className="mt-8 bg-secondary/50 p-6 rounded-lg text-center">
                <h3 className="text-xl font-semibold mb-2">
                  {winnerDeclared ? 'Auction Concluded' : 'Bidding Closed'}
                </h3>
                <p className="text-muted-foreground">
                  {winnerDeclared 
                    ? "The winner has been declared. Awaiting settlement." 
                    : "This auction is not currently active."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Presence & Feed */}
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex justify-between">
              Live Feed
              <div className="flex gap-2 text-xs font-normal">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"/> {presence.watching} watching</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 border-t">
            <BidFeed auctionId={auctionId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
