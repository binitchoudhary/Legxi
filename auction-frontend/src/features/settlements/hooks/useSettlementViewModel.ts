import { useQuery } from '@tanstack/react-query';
import { AXIOS_INSTANCE } from '@/api/client/axios';
import { useGetAuction } from '@/api/generated/auctions/auctions';

// Mock types since OpenAPI did not include the post-auction endpoints in Phase 1.3 yaml
export type SettlementStatus = 'PENDING' | 'PROCESSING' | 'FINALIZING' | 'COMPLETED' | 'FAILED';
export type PaymentStatus = 'PENDING' | 'AUTHORIZED' | 'PAID' | 'FAILED' | 'EXPIRED';
export type TransferStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type CertificateStatus = 'READY' | 'DOWNLOADING' | 'DOWNLOADED' | 'VERIFICATION';

export const useSettlementViewModel = (auctionId: string) => {
  // 1. Fetch Auction (Source of Truth for Winner)
  const auctionQuery = useGetAuction(auctionId);

  const auctionRes = auctionQuery.data?.data;
  const isAuctionSettled = auctionRes && 'success' in auctionRes && auctionRes.success && auctionRes.data.status === 'SETTLED';

  // 2. Fetch Settlement
  const settlementQuery = useQuery({
    queryKey: ['settlement', { auctionId }],
    queryFn: () => AXIOS_INSTANCE.get(`/settlements/auction/${auctionId}`).then(res => res.data),
    enabled: isAuctionSettled,
  });

  const settlementId = settlementQuery.data?.data?.id;

  // Adaptive Polling Logic
  const getPaymentPolling = (status?: PaymentStatus, sStatus?: SettlementStatus) => {
    if (status === 'PAID' || status === 'FAILED') return false;
    if (status === 'PENDING') return 5000;
    if (sStatus === 'FINALIZING') return 5000; // Webhook delay
    return false;
  };

  const getTransferPolling = (status?: TransferStatus) => {
    if (status === 'COMPLETED' || status === 'FAILED') return false;
    if (status === 'PROCESSING') return 10000;
    return false;
  };

  // 3. Fetch Payment
  const paymentQuery = useQuery({
    queryKey: ['payment', { settlementId }],
    queryFn: () => AXIOS_INSTANCE.get(`/payments/settlement/${settlementId}`).then(res => res.data),
    enabled: !!settlementId,
    refetchInterval: (query) => getPaymentPolling(query.state.data?.data?.status, settlementQuery.data?.data?.status),
  });

  // 4. Fetch Transfer
  const transferQuery = useQuery({
    queryKey: ['transfer', { settlementId }],
    queryFn: () => AXIOS_INSTANCE.get(`/transfers/settlement/${settlementId}`).then(res => res.data),
    enabled: !!settlementId && paymentQuery.data?.data?.status === 'PAID',
    refetchInterval: (query) => getTransferPolling(query.state.data?.data?.status),
  });

  // 5. Fetch Certificate
  const certificateQuery = useQuery({
    queryKey: ['certificate', { settlementId }],
    queryFn: () => AXIOS_INSTANCE.get(`/certificates/settlement/${settlementId}`).then(res => res.data),
    enabled: !!settlementId && transferQuery.data?.data?.status === 'COMPLETED',
  });

  // Unified loading & error
  const isLoading = auctionQuery.isLoading || settlementQuery.isLoading;
  const isError = auctionQuery.isError || settlementQuery.isError;

  return {
    isLoading,
    isError,
    auction: (auctionRes && 'success' in auctionRes && auctionRes.success) ? auctionRes.data : undefined,
    settlement: settlementQuery.data?.data,
    payment: paymentQuery.data?.data,
    transfer: transferQuery.data?.data,
    certificate: certificateQuery.data?.data,
  };
};
