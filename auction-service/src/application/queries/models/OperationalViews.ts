export interface AuctionOperationalView {
  id: string;
  shopifyProductId: string;
  status: string;
  currentPrice: string;
  startTime: Date;
  endTime: Date;
  winnerId: string | null;
}

export interface SettlementOperationalView {
  settlementId: string;
  auctionId: string;
  status: string;
  paymentState: string;
  paymentAmount: string;
  winnerId: string;
}

export interface TransferOperationalView {
  transferRequestId: string;
  settlementId: string;
  status: string;
  transferError: string | null;
  transferredAt: Date | null;
}

export interface NotificationOperationalView {
  notificationId: string;
  correlationId: string;
  channel: string;
  status: string; // PENDING, SENT, FAILED, RETRYABLE_FAILURE, TIMED_OUT
  errorReason: string | null;
  sentAt: Date | null;
}

export interface OperationalTimelineDTO {
  auctionId: string;
  events: {
    timestamp: Date;
    source: string; // 'AUCTION', 'SETTLEMENT', 'TRANSFER', 'NOTIFICATION'
    eventType: string;
    details: any;
  }[];
}
