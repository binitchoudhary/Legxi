import {
  RevenueReportDTO,
  AuctionPerformanceDTO,
  OperationsKpiDTO,
  AnalyticsOverviewDTO
} from '../../queries/models/AnalyticsViews';

export class AnalyticsReportAssembler {
  public assembleOverview(
    revenue: RevenueReportDTO,
    performance: AuctionPerformanceDTO,
    operations: OperationsKpiDTO
  ): AnalyticsOverviewDTO {
    return {
      generatedAt: new Date().toISOString(),
      timezone: 'UTC',
      revenue,
      performance,
      operations
    };
  }
}
