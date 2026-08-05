import { PrismaClient } from '@prisma/client';
import { IAdminOperationalQueries } from '../../application/ports/IAdminOperationalQueries';
import {
  AuctionOperationalView,
  SettlementOperationalView,
  TransferOperationalView,
  NotificationOperationalView
} from '../../application/queries/models/OperationalViews';

export class AdminOperationalQueries implements IAdminOperationalQueries {
  constructor(private readonly prisma: PrismaClient) {}

  public async getAuctionStatus(auctionId: string): Promise<AuctionOperationalView | null> {
    // Only SELECTing primitive data, preventing domain aggregate hydration.
    // Querying raw or using findUnique to ensure CQRS boundaries.
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      select: {
        id: true,
        shopifyProductId: true,
        status: true,
        currentPricePaise: true,
        startTime: true,
        endTime: true,
        winningBidId: true
      }
    });

    if (!auction) return null;

    let winnerId: string | null = null;
    if (auction.winningBidId) {
      const bid = await this.prisma.bid.findUnique({
        where: { id: auction.winningBidId },
        select: { userId: true }
      });
      winnerId = bid?.userId || null;
    }

    return {
      id: auction.id,
      shopifyProductId: auction.shopifyProductId,
      status: auction.status,
      currentPrice: auction.currentPricePaise.toString(),
      startTime: auction.startTime,
      endTime: auction.endTime,
      winnerId
    };
  }

  public async getSettlementStatus(auctionId: string): Promise<SettlementOperationalView | null> {
    // Safely querying the DB to find the associated settlement/payment record.
    // Assuming the table is 'payments' mapped to settlements based on current Prisma schema.
    const payments = await this.prisma.$queryRaw<any[]>`
      SELECT id, auction_id, status, amount_paise, user_id 
      FROM payments 
      WHERE auction_id = ${auctionId} 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    if (!payments || payments.length === 0) return null;
    
    const payment = payments[0];
    return {
      settlementId: payment.id,
      auctionId: payment.auction_id,
      status: payment.status,
      paymentState: payment.status,
      paymentAmount: payment.amount_paise?.toString() || '0',
      winnerId: payment.user_id
    };
  }

  public async getSettlementStatusById(settlementId: string): Promise<SettlementOperationalView | null> {
    const payments = await this.prisma.$queryRaw<any[]>`
      SELECT id, auction_id, status, amount_paise, user_id 
      FROM payments 
      WHERE id = ${settlementId} 
      LIMIT 1
    `;

    if (!payments || payments.length === 0) return null;
    
    const payment = payments[0];
    return {
      settlementId: payment.id,
      auctionId: payment.auction_id,
      status: payment.status,
      paymentState: payment.status,
      paymentAmount: payment.amount_paise?.toString() || '0',
      winnerId: payment.user_id
    };
  }

  public async getTransferStatus(settlementId: string): Promise<TransferOperationalView | null> {
    // Read-only query for transfers (Assuming a 'transfers' table or outbox).
    // Using raw to avoid schema dependency if it's stored dynamically for now.
    try {
      const transfers = await this.prisma.$queryRaw<any[]>`
        SELECT id, settlement_id, status, error, transferred_at 
        FROM transfers 
        WHERE settlement_id = ${settlementId} 
        LIMIT 1
      `;
      if (!transfers || transfers.length === 0) return null;
      const t = transfers[0];
      return {
        transferRequestId: t.id,
        settlementId: t.settlement_id,
        status: t.status,
        transferError: t.error || null,
        transferredAt: t.transferred_at || null
      };
    } catch {
      // Graceful fallback if 'transfers' table is purely driven by outbox currently
      return null;
    }
  }

  public async getNotificationStatuses(auctionId: string): Promise<NotificationOperationalView[]> {
    try {
      const notifications = await this.prisma.$queryRaw<any[]>`
        SELECT id, correlation_id, channel, status, error_reason, sent_at 
        FROM notifications 
        WHERE auction_id = ${auctionId}
      `;
      
      return notifications.map(n => ({
        notificationId: n.id,
        correlationId: n.correlation_id,
        channel: n.channel,
        status: n.status,
        errorReason: n.error_reason || null,
        sentAt: n.sent_at || null
      }));
    } catch {
      return [];
    }
  }
}
