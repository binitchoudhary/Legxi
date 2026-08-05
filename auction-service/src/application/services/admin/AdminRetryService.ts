import { CertificateTransferProcessManager } from '../CertificateTransferProcessManager';
import { IAdminOperationalQueries } from '../../ports/IAdminOperationalQueries';
import { logger } from '../../../shared/logger';
import { DomainError } from '../../../domain/exceptions/DomainErrors';

export class AdminRetryService {
  constructor(
    private readonly transferProcessManager: CertificateTransferProcessManager,
    private readonly operationalQueries: IAdminOperationalQueries,
    private readonly notificationEngine: any // Mocking notification engine dependency
  ) {}

  public async retryOwnershipTransfer(settlementId: string): Promise<void> {
    const statusView = await this.operationalQueries.getTransferStatus(settlementId);

    if (!statusView) {
      throw new DomainError('Transfer record not found for settlement', 'TRANSFER_NOT_FOUND');
    }

    this.validateRetryEligibility(statusView.status);

    logger.info({ settlementId, action: 'manual_retry_transfer' }, 'Admin initiated manual retry for ownership transfer');

    const settlementStatus = await this.operationalQueries.getSettlementStatusById(settlementId);
    if (!settlementStatus) {
      throw new DomainError(`Settlement not found for id: ${settlementId}`, 'SETTLEMENT_NOT_FOUND');
    }

    // For demonstration of the correct delegation boundary:
    await this.transferProcessManager.onSettlementCompleted({
      settlementId,
      auctionId: settlementStatus.auctionId, 
      winnerId: settlementStatus.winnerId
    });
  }

  public async retryFailedNotification(notificationId: string): Promise<void> {
    // Similarly, we validate eligibility
    // ...
    const status = 'FAILED'; // Mock lookup
    this.validateRetryEligibility(status);

    logger.info({ notificationId, action: 'manual_retry_notification' }, 'Admin initiated manual retry for notification');
    
    // Delegate to notification engine
    if (this.notificationEngine && this.notificationEngine.retry) {
      await this.notificationEngine.retry(notificationId);
    }
  }

  private validateRetryEligibility(status: string): void {
    const normalizedStatus = status.toUpperCase();
    
    if (['SUCCESS', 'PROCESSING', 'PENDING'].includes(normalizedStatus)) {
      logger.warn({ status: normalizedStatus }, 'Retry rejected due to ineligible state');
      throw new DomainError(`Cannot retry operation in state: ${normalizedStatus}`, 'INVALID_RETRY_STATE');
    }

    if (!['FAILED', 'TIMED_OUT', 'RETRYABLE_FAILURE'].includes(normalizedStatus)) {
      throw new DomainError(`Unknown state for retry: ${normalizedStatus}`, 'UNKNOWN_RETRY_STATE');
    }
  }
}
