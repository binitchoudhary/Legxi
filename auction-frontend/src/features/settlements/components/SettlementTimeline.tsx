import * as React from 'react';
import { StatusTimelineItem } from './StatusTimelineItem';
import { useGetAuction } from '@/api/generated/auctions/auctions';
import { Auction } from '@/api/generated/models';
import { useSettlementViewModel } from '../hooks/useSettlementViewModel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const SettlementTimeline = ({ auctionId }: { auctionId: string }) => {
  const auctionQuery = useGetAuction(auctionId);
  const { auction, settlement, payment, transfer, certificate } = useSettlementViewModel(auctionId);

  // Derive Statuses based on strict sequential logic
  const auctionRes = auctionQuery.data?.data;
  const auctionData = (auctionRes && 'success' in auctionRes && auctionRes.success) ? (auctionRes as any).data : undefined;
  const auctionWonStatus = auctionData?.status === 'SETTLED' ? 'COMPLETED' : 'IDLE';
  const settlementCreatedStatus = settlement ? 'COMPLETED' : 'IDLE';
  
  let paymentStatus: 'IDLE' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' = 'IDLE';
  if (payment) {
    if (payment.status === 'PAID') paymentStatus = 'COMPLETED';
    else if (payment.status === 'FAILED') paymentStatus = 'FAILED';
    else if (payment.status === 'AUTHORIZED') paymentStatus = 'PROCESSING';
    else paymentStatus = 'PENDING';
  } else if (settlement) {
    paymentStatus = 'PENDING';
  }

  let transferStatus: 'IDLE' | 'PROCESSING' | 'COMPLETED' | 'FAILED' = 'IDLE';
  if (transfer) {
    if (transfer.status === 'COMPLETED') transferStatus = 'COMPLETED';
    else if (transfer.status === 'FAILED') transferStatus = 'FAILED';
    else transferStatus = 'PROCESSING';
  } else if (paymentStatus === 'COMPLETED') {
    transferStatus = 'PROCESSING';
  }

  let certStatus: 'IDLE' | 'PROCESSING' | 'COMPLETED' | 'FAILED' = 'IDLE';
  if (certificate) {
    certStatus = 'COMPLETED';
  } else if (transferStatus === 'COMPLETED') {
    certStatus = 'PROCESSING'; // Generating
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settlement Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mt-4">
          <StatusTimelineItem 
            title="Auction Won" 
            description="You successfully won the live auction."
            status={auctionWonStatus} 
            timestamp={auctionData?.updatedAt || new Date().toISOString()} 
          />
          <StatusTimelineItem 
            title="Settlement Initiated" 
            description="The post-auction settlement record was created."
            status={settlementCreatedStatus} 
            timestamp={settlement?.createdAt} 
          />
          <StatusTimelineItem 
            title="Payment" 
            description={paymentStatus === 'FAILED' ? "Payment failed. Please retry." : "Awaiting secure payment transfer."}
            status={paymentStatus} 
            timestamp={payment?.updatedAt} 
          />
          <StatusTimelineItem 
            title="Transfer Ownership" 
            description="Ledger is updating ownership records."
            status={transferStatus} 
            timestamp={transfer?.updatedAt} 
          />
          <StatusTimelineItem 
            title="Certificate Ready" 
            description="Cryptographic certificate generated and ready for download."
            status={certStatus} 
            timestamp={certificate?.createdAt} 
            isLast={true}
          />
        </div>
      </CardContent>
    </Card>
  );
};
