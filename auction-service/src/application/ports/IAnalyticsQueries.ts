import {
  RawRevenueData,
  RawAuctionPerformanceData,
  RawOperationsData
} from '../queries/models/AnalyticsViews';

export interface IAnalyticsQueries {
  fetchRawRevenueMetrics(): Promise<RawRevenueData[]>;
  fetchRawAuctionPerformanceMetrics(): Promise<RawAuctionPerformanceData[]>;
  fetchRawOperationsMetrics(): Promise<RawOperationsData[]>;
}
