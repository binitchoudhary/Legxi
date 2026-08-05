import { PrismaClient } from '@prisma/client';
import { IAnalyticsQueries } from '../../application/ports/IAnalyticsQueries';
import {
  RawRevenueData,
  RawAuctionPerformanceData,
  RawOperationsData
} from '../../application/queries/models/AnalyticsViews';

export class AnalyticsQueries implements IAnalyticsQueries {
  constructor(private readonly prisma: PrismaClient) {}

  public async fetchRawRevenueMetrics(): Promise<RawRevenueData[]> {
    try {
      // Group settlements/payments by status to get total amounts
      const raw = await this.prisma.$queryRaw<any[]>`
        SELECT status, SUM(amount_paise) as amount
        FROM payments
        GROUP BY status
      `;
      
      return raw.map(row => ({
        status: row.status,
        amountPaise: row.amount || 0n
      }));
    } catch {
      return [];
    }
  }

  public async fetchRawAuctionPerformanceMetrics(): Promise<RawAuctionPerformanceData[]> {
    try {
      // Get auction level aggregations
      const raw = await this.prisma.$queryRaw<any[]>`
        SELECT status, 
               (SELECT COUNT(*) FROM bids WHERE bids.auction_id = auctions.id) as bid_count,
               extension_count
        FROM auctions
      `;

      return raw.map(row => ({
        status: row.status,
        bidCount: Number(row.bid_count || 0),
        extensionCount: Number(row.extension_count || 0)
      }));
    } catch {
      return [];
    }
  }

  public async fetchRawOperationsMetrics(): Promise<RawOperationsData[]> {
    const results: RawOperationsData[] = [];
    
    try {
      const notifs = await this.prisma.$queryRaw<any[]>`
        SELECT status, COUNT(*) as count
        FROM notifications
        GROUP BY status
      `;
      results.push(...notifs.map(n => ({
        entityType: 'NOTIFICATION' as const,
        status: n.status,
        count: Number(n.count || 0)
      })));
    } catch {
      // Table might not exist, silently ignore for this phase integration
    }

    try {
      const transfers = await this.prisma.$queryRaw<any[]>`
        SELECT status, COUNT(*) as count
        FROM transfers
        GROUP BY status
      `;
      results.push(...transfers.map(t => ({
        entityType: 'TRANSFER' as const,
        status: t.status,
        count: Number(t.count || 0)
      })));
    } catch {
      // Table might not exist
    }

    return results;
  }
}
