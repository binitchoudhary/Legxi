import { STATES } from './stateMachine.js';
import { getLogger } from '../utils/logger.js';

export function createRecoveryWorker({ attemptRepository, rollbackRepository, draftOrderService, orderService }) {
  const log = getLogger('recovery-worker');

  return {
    async runRecovery(minutesOld = 5) {
      log.info(`Scanning for orphaned payment attempts older than ${minutesOld} minutes...`);
      
      const orphaned = attemptRepository.getOrphanedAttempts(minutesOld);
      if (orphaned.length === 0) {
        log.info('No orphaned attempts found.');
        return;
      }

      log.info(`Found ${orphaned.length} orphaned attempts. Starting recovery...`);

      for (const attempt of orphaned) {
        const reqId = `recovery-${attempt.idempotencyKey}`;
        const attemptLog = log.child({ requestId: reqId, attemptId: attempt.idempotencyKey, status: attempt.status });
        
        try {
          attemptLog.info('Recovering orphaned attempt');

          // 1. Query Shopify to find the order
          let targetOrderId = attempt.orderId;
          
          if (!targetOrderId) {
            // It might have crashed before saving orderId. Let's check the Draft Order.
            const draft = await draftOrderService.getDraftOrder(attempt.draftOrderId, reqId);
            if (draft && draft.existingOrderId) {
              targetOrderId = draft.existingOrderId;
              attemptRepository.update(attempt.idempotencyKey, { orderId: targetOrderId });
              attemptLog.info({ orderId: targetOrderId }, 'Found existing order for draft');
            }
          }

          if (!targetOrderId) {
            // Order was never created. We can safely mark as FAILED.
            attemptLog.info('Order was never created in Shopify. Marking as FAILED.');
            attemptRepository.update(attempt.idempotencyKey, { status: STATES.FAILED, errorMessage: 'Recovery: Order was never created' });
            continue;
          }

          // 2. If the order exists, attempt verification again
          let verificationSucceeded = false;
          try {
            await orderService.verifyPartialPaymentOrder(
              targetOrderId,
              attempt.advanceAmount,
              (parseFloat(attempt.orderTotal) - parseFloat(attempt.advanceAmount)).toString(),
              attempt.orderTotal,
              attempt.currency,
              reqId
            );
            verificationSucceeded = true;
          } catch (verifyErr) {
            attemptLog.warn({ err: verifyErr.message }, 'Recovery verification failed');
          }

          // 3. If verification succeeds, mark SUCCESS
          if (verificationSucceeded) {
            attemptRepository.update(attempt.idempotencyKey, { status: STATES.SUCCESS });
            attemptLog.info('Recovery verification succeeded. Marked as SUCCESS.');
            continue;
          }

          // 4. If verification fails, attempt rollback again
          attemptLog.info('Triggering recovery rollback sequence');
          let cancelStatus = 'PENDING';
          let archiveStatus = 'PENDING';
          let cancelError = null;
          let archiveError = null;

          try {
            await orderService.cancelOrder(targetOrderId, reqId);
            cancelStatus = 'SUCCESS';
          } catch (cancelErr) {
            cancelStatus = 'FAILED';
            cancelError = cancelErr.message;
          }

          try {
            await orderService.closeOrder(targetOrderId, reqId);
            archiveStatus = 'SUCCESS';
          } catch (archiveErr) {
            archiveStatus = 'FAILED';
            archiveError = archiveErr.message;
          }

          const requiresManual = cancelStatus === 'FAILED';

          rollbackRepository.create({
            attemptIdempotencyKey: attempt.idempotencyKey,
            orderId: targetOrderId,
            orderName: attempt.orderName,
            reason: 'Recovery verification failure',
            cancelStatus,
            archiveStatus,
            manualActionRequired: requiresManual,
            cancelError,
            archiveError
          });

          // 5. If rollback succeeds, mark FAILED
          if (!requiresManual) {
            attemptRepository.update(attempt.idempotencyKey, { status: STATES.FAILED, errorMessage: 'Recovery: Rollback completed successfully' });
            attemptLog.info('Recovery rollback succeeded. Marked as FAILED.');
          } else {
            // 6. If rollback still fails, set manualActionRequired=true and emit an alert log
            attemptRepository.update(attempt.idempotencyKey, { status: STATES.FAILED, errorMessage: 'Recovery: Rollback failed, manual action required' });
            attemptLog.error({ event: 'MANUAL_INTERVENTION_REQUIRED', orderId: targetOrderId }, 'CRITICAL: Rollback failed during recovery. Manual action required in Shopify Admin.');
          }

        } catch (err) {
          attemptLog.error({ err: err.message }, 'Unexpected error during recovery for this attempt');
        }
      }
      
      log.info('Recovery scan complete.');
    }
  };
}
