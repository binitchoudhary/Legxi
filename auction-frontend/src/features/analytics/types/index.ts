export interface AnalyticsOverviewDTO {
  totalAuctions: number;
  activeAuctions: number;
  totalBids: number;
  totalRevenuePaise: string;
}

export interface RevenueDTO {
  settledRevenuePaise: string;
  pendingRevenuePaise: string;
  refundedRevenuePaise: string;
  history: Array<{
    date: string;
    amountPaise: string;
  }>;
}

export interface OperationsDTO {
  completedAuctions: number;
  settlementSuccessRate: number;
  transferSuccessRate: number;
  notificationSuccessRate: number;
}

export interface PerformanceDTO {
  averageBidsPerAuction: number;
  highestBidPaise: string;
  auctionGrowthRate: number;
}
