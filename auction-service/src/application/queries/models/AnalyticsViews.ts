// ==========================================
// Raw DTOs (Data fetched directly from DB)
// ==========================================
export interface RawRevenueData {
  status: string;
  amountPaise: bigint | string;
}

export interface RawAuctionPerformanceData {
  status: string;
  bidCount: number;
  extensionCount: number;
}

export interface RawOperationsData {
  entityType: 'NOTIFICATION' | 'TRANSFER';
  status: string;
  count: number;
}

// ==========================================
// Calculated KPI DTOs (Outputs from pure calculators)
// ==========================================
export interface RevenueReportDTO {
  totalRevenue: string;
  settledRevenue: string;
  pendingRevenue: string;
  currency: string;
}

export interface AuctionPerformanceDTO {
  totalAuctions: number;
  completedAuctions: number;
  totalBids: number;
  totalExtensions: number;
  avgBidsPerAuction: string;
  avgExtensionsPerAuction: string;
}

export interface OperationsKpiDTO {
  notificationDeliveryRate: string;
  transferSuccessRate: string;
  failedNotificationsCount: number;
  failedTransfersCount: number;
}

// ==========================================
// Overview Dashboard (Produced by Assembler)
// ==========================================
export interface AnalyticsOverviewDTO {
  generatedAt: string;
  timezone: string;
  revenue: RevenueReportDTO;
  performance: AuctionPerformanceDTO;
  operations: OperationsKpiDTO;
}
