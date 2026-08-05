import { IEventPublisher } from '../../application/ports/IEventPublisher';
import { ITransferService } from '../ports/ITransferService';
import { TransferRequestFactory } from './TransferRequestFactory';
import { RetryExecutor } from '../utils/RetryExecutor';
import { logger } from '../../shared/logger';
import { randomUUID } from 'crypto';

export class CertificateTransferProcessManager {
  private transferRetryExecutor: RetryExecutor;

  constructor(
    private readonly transferService: ITransferService,
    private readonly eventPublisher: IEventPublisher,
    private readonly transferRequestFactory: TransferRequestFactory
  ) {
    this.transferRetryExecutor = new RetryExecutor({
      maxRetries: 3,
      baseDelayMs: 200,
      maxJitterMs: 300,
      shouldRetry: (error: any) => error.isTransient === true
    });
  }

  public async onSettlementCompleted(eventPayload: { settlementId: string; auctionId: string; winnerId?: string }): Promise<void> {
    const { settlementId, auctionId } = eventPayload;
    const winnerId = eventPayload.winnerId || 'unknown-winner';
    const correlationId = randomUUID();

    logger.info({ settlementId, auctionId, correlationId, metric: 'transfer_request_initiated' }, 'Initiating certificate ownership transfer');

    await this.eventPublisher.publish('OwnershipTransferRequested', {
      settlementId, auctionId, winnerId, correlationId, requestedAt: new Date().toISOString()
    });

    try {
      await this.transferRetryExecutor.executeWithRetry(
        'requestOwnershipTransfer',
        { settlementId, auctionId, correlationId },
        async () => {
          // Resolve domain facts
          const { handle, phone } = await this.transferRequestFactory.getHandleAndPhone(auctionId, winnerId);

          // Idempotency / Existence check
          const existingRecord = await this.transferService.getOwnershipRecord(handle, correlationId);
          
          if (existingRecord) {
            // Check if already transferred to winner (idempotency success)
            if (existingRecord.current_owner_phone === phone) {
              logger.info({ settlementId, auctionId, handle, correlationId }, 'Ownership already matches winner. Idempotency success.');
              return; // Already done
            }

            // Otherwise, it needs a secondary transfer (PUT)
            const payload = await this.transferRequestFactory.buildUpdatePayload(auctionId, winnerId);
            await this.transferService.updateOwnership(handle, payload, correlationId);
          } else {
            // Needs primary creation (POST)
            try {
              const payload = await this.transferRequestFactory.buildCreatePayload(auctionId, winnerId);
              await this.transferService.createOwnership(payload, correlationId);
            } catch (createError: any) {
              // 409 Conflict indicates it was created by a concurrent retry or race condition
              if (createError.status === 409) {
                logger.warn({ settlementId, auctionId, handle, correlationId }, '409 Conflict during creation. Assuming concurrent success, verifying next attempt.');
                createError.isTransient = true; // Force a retry which will hit the getOwnershipRecord path
                throw createError;
              }
              throw createError;
            }
          }
        }
      );

      logger.info({ settlementId, auctionId, correlationId, metric: 'transfer_success' }, 'Ownership transfer completed successfully');

      await this.eventPublisher.publish('OwnershipTransferred', {
        settlementId, auctionId, winnerId, correlationId, transferredAt: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error({ settlementId, auctionId, correlationId, err: error, metric: 'transfer_failure_permanent' }, 'Ownership transfer failed permanently');

      await this.eventPublisher.publish('OwnershipTransferFailed', {
        settlementId, auctionId, winnerId, correlationId, reason: error.message || 'Unknown error', failedAt: new Date().toISOString()
      });
    }
  }
}
