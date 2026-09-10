import { PrismaClient } from '@prisma/client';
import { IAuctionTransactionBoundary, ITransactionContext, AuditLog } from '../../application/ports/IAuctionTransactionBoundary';
import { Auction } from '../../domain/models/Auction';
import { Bid } from '../../domain/models/Bid';
import { BidIntent } from '../../domain/models/BidIntent';
import { BidAmount } from '../../domain/value-objects/BidAmount';
import { AuctionStatus, AllowedAuctionStatus } from '../../domain/value-objects/AuctionStatus';
import { AuctionTimeWindow } from '../../domain/value-objects/AuctionTimeWindow';
import { AuctionNotActiveError } from '../../domain/exceptions/DomainErrors';
import { prisma } from '../../database';
import { ulid } from 'ulidx';

/**
 * PrismaAuctionTransactionAdapter
 * 
 * Implements pessimistic locking (SELECT ... FOR UPDATE) for auction mutations.
 * No Redis/network I/O is permitted inside the transaction boundary.
 * Prisma types do NOT leak into the Domain/Application layers.
 */
export class PrismaAuctionTransactionAdapter implements IAuctionTransactionBoundary {

  async executeWithLock<T>(
    auctionId: string,
    operation: (lockedAuction: Auction, txContext: ITransactionContext) => Promise<T>
  ): Promise<T> {
    return await prisma.$transaction(async (tx) => {
      // 1. Acquire pessimistic row lock
      const rows: any[] = await tx.$queryRaw`
        SELECT * FROM auctions WHERE id = ${auctionId} FOR UPDATE
      `;

      if (!rows || rows.length === 0) {
        throw new AuctionNotActiveError(`Auction ${auctionId} not found`);
      }

      const row = rows[0];

      // 2. Hydrate Domain Model (Prisma types do NOT leak beyond this boundary)
      const auction = new Auction(
        row.id,
        row.shopify_product_id,
        new AuctionTimeWindow(new Date(row.start_time), new Date(row.end_time)),
        new AuctionStatus(row.status as AllowedAuctionStatus),
        new BidAmount(row.starting_price_paise.toString()),
        new BidAmount(row.current_price_paise.toString()),
        new BidAmount(row.min_increment_paise.toString()),
        row.reserve_price_paise ? new BidAmount(row.reserve_price_paise.toString()) : null,
        row.winning_bid_id,
        row.version,
        row.extension_count,
        row.extension_duration_sec,
        row.extension_threshold_sec,
        row.max_extensions
      );

      // 3. Create transaction context bound to this `tx`
      const context: ITransactionContext = {
        async checkIdempotency(intentId: string): Promise<BidIntent | null> {
          const existing = await tx.bidIntent.findUnique({ where: { intentId } });
          if (!existing) return null;
          return new BidIntent(
            existing.intentId,
            existing.auctionId,
            existing.userId,
            new BidAmount(existing.amountPaise.toString()),
            existing.bidId,
            existing.createdAt
          );
        },

        async persistBid(updatedAuction: Auction, bid: Bid, intent: BidIntent): Promise<void> {
          // Insert the accepted Bid
          await tx.bid.create({
            data: {
              id: bid.getId(),
              auctionId: bid.getAuctionId(),
              userId: bid.getUserId(),
              amountPaise: BigInt(bid.getAmount().toString()),
              isProxy: bid.getIsProxy(),
              createdAt: bid.getCreatedAt(),
            }
          });

          // Insert the BidIntent
          await tx.bidIntent.create({
            data: {
              intentId: intent.getIntentId(),
              auctionId: intent.getAuctionId(),
              userId: intent.getUserId(),
              amountPaise: BigInt(intent.getAmount().toString()),
              bidId: bid.getId(),
              createdAt: intent.getCreatedAt(),
            }
          });
        },

        async fetchBids(auctionId: string): Promise<Bid[]> {
          const rows = await tx.bid.findMany({ where: { auctionId } });
          return rows.map((r: any) => new Bid(
            r.id,
            r.auctionId,
            r.userId,
            new BidAmount(r.amountPaise.toString()),
            r.isProxy,
            r.createdAt
          ));
        },

        async updateAuction(updatedAuction: Auction): Promise<void> {
          await tx.auction.update({
            where: { id: updatedAuction.getId() },
            data: {
              status: updatedAuction.getStatus().getValue(),
              currentPricePaise: BigInt(updatedAuction.getCurrentPrice().toString()),
              winningBidId: updatedAuction.getWinningBidId(),
              endTime: updatedAuction.getTimeWindow().getEndTime(),
              extensionCount: updatedAuction.getExtensionCount(),
              version: updatedAuction.getVersion(),
              updatedAt: new Date(),
            }
          });
        },

        async logAudit(audit: AuditLog): Promise<void> {
          await tx.outboxEvent.create({
            data: {
              id: ulid(),
              eventType: 'AUDIT_LOG_ENTRY',
              payload: {
                entityType: 'AUCTION',
                entityId: auctionId,
                actorId: audit.actorId,
                action: audit.action,
                newState: audit.details,
              },
              status: 'PENDING'
            }
          });
        },

        async insertOutboxEvent(event: any): Promise<void> {
          await tx.outboxEvent.create({
            data: {
              id: ulid(),
              eventType: 'DOMAIN_EVENT',
              payload: event,
              status: 'PENDING'
            }
          });
        },

        async getSettlement(auctionId: string): Promise<any> {
          const rows: any[] = await tx.$queryRaw`
            SELECT * FROM settlements WHERE auction_id = ${auctionId} FOR UPDATE
          `;
          if (!rows || rows.length === 0) return null;
          
          const record = rows[0];
          let providerRef: any = null;
          if (record.provider && record.provider_payment_id) {
            providerRef = new (await import('../../domain/value-objects/PaymentProviderReference')).PaymentProviderReference(
              record.provider,
              record.provider_payment_id,
              record.provider_event_id || undefined
            );
          }

          const { Settlement } = await import('../../domain/models/Settlement');
          return new Settlement(
            record.id,
            record.auction_id,
            record.winner_id,
            record.payment_state,
            record.settlement_status,
            record.payment_window_opened_at,
            record.payment_attempts,
            providerRef,
            record.version
          );
        },

        async updateSettlement(settlement: any): Promise<void> {
          await tx.settlement.update({
            where: { id: settlement.settlementId },
            data: {
              paymentState: settlement.paymentState,
              settlementStatus: settlement.settlementStatus,
              paymentAttempts: settlement.paymentAttempts,
              provider: settlement.providerReference?.provider,
              providerPaymentId: settlement.providerReference?.providerPaymentId,
              providerEventId: settlement.providerReference?.providerEventId,
              version: settlement.version + 1
            }
          });
        },

        async recordWebhookEvent(event: any): Promise<void> {
          await tx.webhookEvent.create({
            data: {
              provider: event.provider,
              providerEventId: event.providerEventId,
              providerPaymentId: event.providerPaymentId,
              auctionId: event.auctionId,
              receivedAt: new Date(),
              processedAt: new Date(),
              status: 'PROCESSED',
              signatureVerified: event.signatureVerified,
              processingResult: event.processingResult,
              correlationId: event.correlationId,
              requestId: event.requestId,
              retryCount: 0,
              rawPayloadHash: event.rawPayloadHash
            }
          });
        }
      };

      // 4. Execute domain logic callback
      return await operation(auction, context);
    }, { isolationLevel: 'ReadCommitted' });
  }
}
