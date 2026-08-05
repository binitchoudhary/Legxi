'use client';

import * as React from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useLiveAuctionStore } from '../store/useLiveAuctionStore';
import { useListAuctionBids } from '@/api/generated/bids/bids';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

export const BidFeed = ({ auctionId }: { auctionId: string }) => {
  const { bidHistoryDelta, currentLeader } = useLiveAuctionStore();
  
  // Base hydration from REST (TanStack Query)
  const { data: baseData, isLoading } = useListAuctionBids(auctionId, { limit: 100 });
  
  // Merge REST data with Socket delta
  const bidsRes = baseData?.data;
  const mergedBids = React.useMemo(() => {
    const baseBids = (bidsRes && 'success' in bidsRes && bidsRes.success) ? bidsRes.data : [];
    // Combine and deduplicate
    const combined = [...bidHistoryDelta, ...baseBids];
    const uniqueMap = new Map();
    combined.forEach(b => {
      // Handle the fact that REST response uses 'id' but delta uses 'bidId'
      const key = (b as any).bidId || (b as any).id;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, b);
      }
    });
    const result = Array.from(uniqueMap.values());
    result.sort((a, b) => BigInt(b.amountPaise) > BigInt(a.amountPaise) ? 1 : -1);
    return result;
  }, [baseData, bidHistoryDelta]);

  if (isLoading && mergedBids.length === 0) return <div>Loading bid history...</div>;
  if (mergedBids.length === 0) return <div>No bids yet. Be the first!</div>;

  return (
    <Card className="h-[400px] flex flex-col">
      <CardContent className="flex-1 p-0">
        <Virtuoso
          style={{ height: '100%' }}
          data={mergedBids}
          itemContent={(index, bid) => {
            const isWinning = (bid as any).userId === currentLeader;
            const amount = Number(bid.amountPaise) / 100; // Assuming paise
            const time = bid.createdAt ? format(new Date(bid.createdAt), 'HH:mm:ss') : format(new Date((bid as any).timestamp), 'HH:mm:ss');
            
            return (
              <div className={`p-4 border-b flex justify-between items-center transition-colors ${isWinning ? 'bg-primary/10' : ''}`}>
                <div className="flex flex-col">
                  <span className="font-semibold truncate w-32">
                    User: {(bid as any).userId.substring(0, 8)}...
                  </span>
                  <span className="text-xs text-muted-foreground">{time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">${amount.toFixed(2)}</span>
                  {isWinning && <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">Winning</span>}
                </div>
              </div>
            );
          }}
        />
      </CardContent>
    </Card>
  );
};
