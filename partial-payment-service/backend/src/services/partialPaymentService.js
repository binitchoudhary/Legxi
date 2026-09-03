import { STATES, stateMachine } from './stateMachine.js';
import { BUSINESS_EVENTS, eventBus } from './events.js';
import { validationService } from './validation.js';
import { DuplicateRequestError, ConcurrentRequestError, RollbackError } from './errors.js';
import { ENV } from '../config/env.js';

export function createPartialPaymentService({ attemptRepository, rollbackRepository, draftOrderService, orderService }) {
  
  async function updateState(idempotencyKey, oldState, newState, updates = {}) {
    stateMachine.validateTransition(oldState, newState);
    return attemptRepository.update(idempotencyKey, { status: newState, ...updates });
  }

  return {
    async processAdvancePayment(payload, reqId) {
      // 1. Input Validation
      validationService.validateInput(payload);
      const { idempotencyKey, draftOrderId, advanceAmount, currency, paymentMode, staffNote } = payload;

      // 2. Idempotency Check
      const existing = attemptRepository.getById(idempotencyKey);
      if (existing) {
        if (existing.status === STATES.SUCCESS) return existing;
        if (existing.status === STATES.FAILED) return existing; // Returns the failed record (safe replay)
        throw new DuplicateRequestError('Request is currently being processed', existing);
      }

      // 3. Concurrency Protection (Check if another PENDING/active attempt exists for this draft order)
      // Done safely via DB constraint (we will add a migration for uniqueness on active drafts).
      // Here we just catch SQLite constraint errors if they happen, or we rely on Draft Order check later.
      // But let's proactively create the ATTEMPT
      let attempt;
      try {
        attempt = attemptRepository.create({
          idempotencyKey,
          draftOrderId,
          advanceAmount,
          currency,
          paymentMode,
          staffNote,
          status: STATES.PENDING
        });
      } catch (err) {
        if (err.message.includes('UNIQUE constraint failed: payment_attempts.draft_order_id')) {
          throw new ConcurrentRequestError('Another payment is actively being processed for this Draft Order');
        }
        throw err;
      }

      eventBus.emit(BUSINESS_EVENTS.ATTEMPT_CREATED, { requestId: reqId, attemptId: idempotencyKey, draftOrderId });

      try {
        // 4. Fetch Draft & Business Validation
        const draft = await draftOrderService.getDraftOrder(draftOrderId, reqId);
        const { totalAmount, remainingAmount } = validationService.validateBusinessRules(draft, advanceAmount, currency);
        
        attempt = await attemptRepository.update(idempotencyKey, { 
          orderTotal: totalAmount.toString(),
          draftOrderName: draft.name || null
        });

        eventBus.emit(BUSINESS_EVENTS.DRAFT_VALIDATED, { requestId: reqId, attemptId: idempotencyKey, draftOrderId, totalAmount, remainingAmount });

        // 5. State Transition to CREATING_ORDER
        attempt = await updateState(idempotencyKey, STATES.PENDING, STATES.CREATING_ORDER);

        // 5.5 Update Draft Order with custom attributes for email templates
        await draftOrderService.updateDraftOrderAttributes(draftOrderId, [
          { key: "advance_payment_amount", value: advanceAmount.toString() },
          { key: "advance_payment_mode", value: paymentMode || "Unknown" },
          { key: "advance_payment_currency", value: currency || "INR" }
        ], reqId);

        // 6. Execute DraftOrderComplete
        const orderData = await orderService.completeDraftOrder(draftOrderId, reqId);
          const orderId = orderData.id;
          const orderName = orderData.name;
          const legacyResourceId = orderData.legacyResourceId;

          // 6.5 Persist orderId/orderName immediately so rollback can see it if step 7 fails
          attempt = await attemptRepository.update(idempotencyKey, { orderId, orderName });
          eventBus.emit(BUSINESS_EVENTS.ORDER_CREATED, { requestId: reqId, attemptId: idempotencyKey, draftOrderId, orderId });

          // 7. Add Transaction via REST API
          if (!ENV.DRY_RUN && legacyResourceId) {
            const res = await fetch(`https://${ENV.SHOPIFY_STORE}/admin/api/${ENV.SHOPIFY_API_VERSION}/orders/${legacyResourceId}/transactions.json`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': ENV.SHOPIFY_ADMIN_TOKEN
              },
              body: JSON.stringify({
                transaction: {
                  kind: 'capture',
                  gateway: 'manual',
                  amount: advanceAmount,
                  currency: currency,
                  status: 'success'
                }
              })
            });
            if (!res.ok) {
              let errBody = '';
              try { errBody = await res.text(); } catch (_) { /* body unreadable */ }
              throw new Error(`Failed to apply transaction: HTTP ${res.status} ${res.statusText}${errBody ? ` — ${errBody}` : ' (empty response body)'}`);
            }
          }

        // 8. State Transition to VERIFYING
        attempt = await updateState(idempotencyKey, STATES.CREATING_ORDER, STATES.VERIFYING);

        // 9. Verify Order Math & Status
        await orderService.verifyPartialPaymentOrder(
          orderId, 
          advanceAmount, 
          remainingAmount.toString(), 
          totalAmount.toString(), 
          currency, 
          reqId
        );

        eventBus.emit(BUSINESS_EVENTS.ORDER_VERIFIED, { requestId: reqId, attemptId: idempotencyKey, draftOrderId, orderId });

        // 10. State Transition to SUCCESS
        attempt = await updateState(idempotencyKey, STATES.VERIFYING, STATES.SUCCESS);
        eventBus.emit(BUSINESS_EVENTS.SUCCESS, { requestId: reqId, attemptId: idempotencyKey, draftOrderId, orderId });

        return attempt;

      } catch (err) {
        // Trigger Rollback if we actually created an order but failed verification/internal logic
        if (attempt.orderId && attempt.status !== STATES.SUCCESS) {
          eventBus.emit(BUSINESS_EVENTS.ROLLBACK_STARTED, { requestId: reqId, attemptId: idempotencyKey, draftOrderId, orderId: attempt.orderId, reason: err.message });
          attempt = await updateState(idempotencyKey, attempt.status, STATES.ROLLBACK, { errorMessage: err.message });
          
          let cancelStatus = 'PENDING';
          let archiveStatus = 'PENDING';
          let cancelError = null;
          let archiveError = null;

          try {
            await orderService.cancelOrder(attempt.orderId, reqId);
            cancelStatus = 'SUCCESS';
          } catch (cancelErr) {
            cancelStatus = 'FAILED';
            cancelError = cancelErr.message;
          }

          try {
            await orderService.closeOrder(attempt.orderId, reqId);
            archiveStatus = 'SUCCESS';
          } catch (archiveErr) {
            archiveStatus = 'FAILED';
            archiveError = archiveErr.message;
          }

          const requiresManual = cancelStatus === 'FAILED';

          rollbackRepository.create({
            attemptIdempotencyKey: idempotencyKey,
            orderId: attempt.orderId,
            orderName: attempt.orderName,
            reason: err.message,
            cancelStatus,
            archiveStatus,
            manualActionRequired: requiresManual,
            cancelError,
            archiveError
          });

          eventBus.emit(BUSINESS_EVENTS.ROLLBACK_COMPLETED, { requestId: reqId, attemptId: idempotencyKey, orderId: attempt.orderId, requiresManual });
        }

        // Final Transition to FAILED
        attempt = await updateState(idempotencyKey, attempt.status, STATES.FAILED, { errorMessage: err.message });
        eventBus.emit(BUSINESS_EVENTS.ATTEMPT_FAILED, { requestId: reqId, attemptId: idempotencyKey, draftOrderId, error: err.message });

        throw err;
      }
    }
  };
}
