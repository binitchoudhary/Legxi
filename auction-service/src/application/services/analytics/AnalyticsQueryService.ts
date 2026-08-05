import { IAnalyticsQueries } from '../../ports/IAnalyticsQueries';
import { AnalyticsReportAssembler } from './AnalyticsReportAssembler';
import { RevenueCalculator } from './calculators/RevenueCalculator';
import { AuctionPerformanceCalculator } from './calculators/AuctionPerformanceCalculator';
import { OperationsKpiCalculator } from './calculators/OperationsKpiCalculator';
import { AnalyticsOverviewDTO } from '../../queries/models/AnalyticsViews';

export class AnalyticsQueryService {
  constructor(
    private readonly queries: IAnalyticsQueries,
    private readonly assembler: AnalyticsReportAssembler,
    private readonly revenueCalculator: RevenueCalculator,
    private readonly performanceCalculator: AuctionPerformanceCalculator,
    private readonly operationsCalculator: OperationsKpiCalculator
  ) {}

  public async getOverviewDashboard(): Promise<AnalyticsOverviewDTO> {
    // 1. Fetch raw uncalculated SQL aggregates
    const rawRevenue = await this.queries.fetchRawRevenueMetrics();
    const rawPerformance = await this.queries.fetchRawAuctionPerformanceMetrics();
    const rawOperations = await this.queries.fetchRawOperationsMetrics();

    // 2. Execute pure functions to map raw DB data into calculated KPIs
    const revenueDTO = this.revenueCalculator.calculate(rawRevenue);
    const performanceDTO = this.performanceCalculator.calculate(rawPerformance);
    const operationsDTO = this.operationsCalculator.calculate(rawOperations);

    // 3. Assemble and tag with execution context
    return this.assembler.assembleOverview(revenueDTO, performanceDTO, operationsDTO);
  }
}
