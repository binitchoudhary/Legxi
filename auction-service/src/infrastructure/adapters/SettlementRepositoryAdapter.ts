import { ISettlementRepository } from '../../application/ports/ISettlementRepository';
import { Settlement, SettlementStatus, PaymentState } from '../../domain/models/Settlement';
import { PaymentProviderReference } from '../../domain/value-objects/PaymentProviderReference';
import { prisma } from '../../database';
import { logger } from '../../shared/logger';

export class SettlementRepositoryAdapter implements ISettlementRepository {
  async findById(settlementId: string): Promise<Settlement | null> {
    const record = await prisma.settlement.findUnique({ where: { id: settlementId } });
    if (!record) return null;
    return this.mapToDomain(record);
  }

  async findByAuctionId(auctionId: string): Promise<Settlement | null> {
    const record = await prisma.settlement.findUnique({ where: { auctionId } });
    if (!record) return null;
    return this.mapToDomain(record);
  }

  async save(settlement: Settlement): Promise<void> {
    await prisma.settlement.create({
      data: {
        id: settlement.settlementId,
        auctionId: settlement.auctionId,
        winnerId: settlement.winnerId,
        paymentState: settlement.paymentState,
        settlementStatus: settlement.settlementStatus,
        paymentWindowOpenedAt: settlement.paymentWindowOpenedAt,
        paymentAttempts: settlement.paymentAttempts,
        provider: settlement.providerReference?.provider,
        providerPaymentId: settlement.providerReference?.providerPaymentId,
        providerEventId: settlement.providerReference?.providerEventId,
        version: settlement.version
      }
    });
    logger.debug({ settlementId: settlement.settlementId }, 'Settlement saved');
  }

  async saveWithOutboxEvent(settlement: Settlement, event: any): Promise<void> {
    const { ulid } = await import('ulidx');
    await prisma.$transaction(async (tx) => {
      await tx.settlement.create({
        data: {
          id: settlement.settlementId,
          auctionId: settlement.auctionId,
          winnerId: settlement.winnerId,
          paymentState: settlement.paymentState,
          settlementStatus: settlement.settlementStatus,
          paymentWindowOpenedAt: settlement.paymentWindowOpenedAt,
          paymentAttempts: settlement.paymentAttempts,
          provider: settlement.providerReference?.provider,
          providerPaymentId: settlement.providerReference?.providerPaymentId,
          providerEventId: settlement.providerReference?.providerEventId,
          version: settlement.version
        }
      });

      await tx.outboxEvent.create({
        data: {
          id: ulid(),
          eventType: 'DOMAIN_EVENT',
          payload: event,
          status: 'PENDING'
        }
      });
    });
    logger.debug({ settlementId: settlement.settlementId }, 'Settlement and outbox event saved atomically');
  }

  async updateOptimistically(settlement: Settlement, currentVersion: number): Promise<void> {
    const result = await prisma.settlement.updateMany({
      where: {
        id: settlement.settlementId,
        version: currentVersion
      },
      data: {
        paymentState: settlement.paymentState,
        settlementStatus: settlement.settlementStatus,
        paymentAttempts: settlement.paymentAttempts,
        provider: settlement.providerReference?.provider,
        providerPaymentId: settlement.providerReference?.providerPaymentId,
        providerEventId: settlement.providerReference?.providerEventId,
        version: currentVersion + 1
      }
    });

    if (result.count === 0) {
      throw new Error(`Optimistic locking failed for settlement ${settlement.settlementId}`);
    }
    
    // Update domain object version
    settlement.version = currentVersion + 1;
    logger.debug({ settlementId: settlement.settlementId, version: settlement.version }, 'Settlement updated');
  }

  private mapToDomain(record: any): Settlement {
    let providerRef: PaymentProviderReference | null = null;
    if (record.provider && record.providerPaymentId) {
      providerRef = new PaymentProviderReference(
        record.provider,
        record.providerPaymentId,
        record.providerEventId || undefined
      );
    }

    return new Settlement(
      record.id,
      record.auctionId,
      record.winnerId,
      record.paymentState as PaymentState,
      record.settlementStatus as SettlementStatus,
      record.paymentWindowOpenedAt,
      record.paymentAttempts,
      providerRef,
      record.version
    );
  }
}
