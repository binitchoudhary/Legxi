import { RawAuctionPerformanceData, AuctionPerformanceDTO } from '../../../queries/models/AnalyticsViews';

export class AuctionPerformanceCalculator {
  public calculate(rawData: RawAuctionPerformanceData[]): AuctionPerformanceDTO {
    let totalAuctions = 0;
    let completedAuctions = 0;
    let totalBids = 0;
    let totalExtensions = 0;

    for (const row of rawData) {
      totalAuctions++;
      totalBids += row.bidCount;
      totalExtensions += row.extensionCount;

      if (row.status.toUpperCase() === 'CLOSED') {
        completedAuctions++;
      }
    }

    const avgBids = totalAuctions > 0 ? (totalBids / totalAuctions).toFixed(2) : '0.00';
    const avgExts = totalAuctions > 0 ? (totalExtensions / totalAuctions).toFixed(2) : '0.00';

    return {
      totalAuctions,
      completedAuctions,
      totalBids,
      totalExtensions,
      avgBidsPerAuction: avgBids,
      avgExtensionsPerAuction: avgExts
    };
  }
}
