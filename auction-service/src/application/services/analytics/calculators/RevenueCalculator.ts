import { RawRevenueData, RevenueReportDTO } from '../../../queries/models/AnalyticsViews';

export class RevenueCalculator {
  public calculate(rawData: RawRevenueData[]): RevenueReportDTO {
    let total = 0n;
    let settled = 0n;
    let pending = 0n;

    for (const row of rawData) {
      const amount = BigInt(row.amountPaise);
      total += amount;

      const status = row.status.toUpperCase();
      if (status === 'COMPLETED' || status === 'SETTLED' || status === 'SUCCESS') {
        settled += amount;
      } else if (status === 'PENDING' || status === 'PROCESSING') {
        pending += amount;
      }
    }

    return {
      totalRevenue: total.toString(),
      settledRevenue: settled.toString(),
      pendingRevenue: pending.toString(),
      currency: 'INR'
    };
  }
}
