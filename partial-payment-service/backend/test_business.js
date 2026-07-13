import { createPartialPaymentService } from './src/services/partialPaymentService.js';
import { attemptRepository } from './src/repositories/attemptRepository.js';
import { rollbackRepository } from './src/repositories/rollbackRepository.js';
import { ValidationError, DuplicateRequestError, ConcurrentRequestError, BusinessRuleError } from './src/services/errors.js';
import { OrderVerificationError } from './src/shopify/order.js';
import { v4 as uuidv4 } from 'uuid';
import db from './src/database/db.js';
import fs from 'fs';

console.log('\n--- Business Logic Tests ---\n');

let passCount = 0;
let failCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${testName}`);
    failCount++;
  }
}

async function runTests() {
  try {
    const draftOrderService = {
      async getDraftOrder(id) {
        if (id === 'gid://shopify/DraftOrder/business-fail') {
          return { status: 'COMPLETED', totalAmount: '1000', currencyCode: 'INR', existingOrderId: '123', customerId: '123' };
        }
        return { status: 'OPEN', totalAmount: '10000', currencyCode: 'INR', existingOrderId: null, customerId: '123', name: '#DRAFT-1' };
      }
    };

    const orderService = {
      async createOrder(input) {
        return { id: 'gid://shopify/Order/success-1', name: '#ORDER-1' };
      },
      async verifyPartialPaymentOrder(orderId) {
        if (orderId === 'gid://shopify/Order/verify-fail' || orderId === 'gid://shopify/Order/rollback-fail') {
          throw new OrderVerificationError('Math mismatch');
        }
        return true;
      },
      async cancelOrder(orderId) {
        if (orderId === 'gid://shopify/Order/rollback-fail') {
          throw new Error('Cancel failed network');
        }
        return true;
      },
      async closeOrder() {
        return true;
      }
    };

    const service = createPartialPaymentService({ attemptRepository, rollbackRepository, draftOrderService, orderService });

    // 1. Validation Failure
    let threwValidation = false;
    try {
      await service.processAdvancePayment({ advanceAmount: '-10' }, 'req');
    } catch (err) {
      if (err instanceof ValidationError) threwValidation = true;
    }
    assert(threwValidation, 'Validation Failure works');

    // 2. Business Rule Failure
    let threwBusiness = false;
    try {
      await service.processAdvancePayment({
        idempotencyKey: uuidv4(),
        draftOrderId: 'gid://shopify/DraftOrder/business-fail',
        advanceAmount: '500',
        currency: 'INR',
        paymentMode: 'UPI'
      }, 'req');
    } catch (err) {
      if (err instanceof BusinessRuleError) threwBusiness = true;
    }
    assert(threwBusiness, 'Business Rule Failure works (draft completed)');

    // 3. Successful Flow
    const successKey = uuidv4();
    const draftId = 'gid://shopify/DraftOrder/success';
    const result = await service.processAdvancePayment({
      idempotencyKey: successKey,
      draftOrderId: draftId,
      advanceAmount: '1000',
      currency: 'INR',
      paymentMode: 'UPI'
    }, 'req');
    assert(result.status === 'SUCCESS', 'Successful Flow works');

    // 4. Duplicate Request
    let threwDuplicate = false;
    try {
      const dup = await service.processAdvancePayment({
        idempotencyKey: successKey, // re-using same key
        draftOrderId: draftId,
        advanceAmount: '1000',
        currency: 'INR',
        paymentMode: 'UPI'
      }, 'req');
      // If it returned previous success without throwing DuplicateRequestError, that's exactly what idempotency should do!
      if (dup.status === 'SUCCESS') threwDuplicate = true; // Wait, DuplicateRequestError only throws if it's currently processing. If SUCCESS, it returns the result safely.
    } catch (err) {
      console.error(err);
    }
    assert(threwDuplicate, 'Duplicate Request works (idempotency returns previous success)');

    // 5. Concurrent Request (Simulate another active request)
    const activeKey = uuidv4();
    const concurrentDraftId = 'gid://shopify/DraftOrder/concurrent';
    // Insert a dummy active record
    db.prepare(`INSERT INTO payment_attempts (idempotency_key, draft_order_id, advance_amount, currency, payment_mode, status) VALUES (?, ?, '1', 'INR', 'UPI', 'PENDING')`).run(activeKey, concurrentDraftId);
    let threwConcurrent = false;
    try {
      await service.processAdvancePayment({
        idempotencyKey: uuidv4(), // Different key
        draftOrderId: concurrentDraftId, // Same draft order
        advanceAmount: '1000',
        currency: 'INR',
        paymentMode: 'UPI'
      }, 'req');
    } catch (err) {
      if (err instanceof ConcurrentRequestError) threwConcurrent = true;
    }
    assert(threwConcurrent, 'Concurrent Request (Unique DB constraint) works');

    // 6. Verification Failure -> Rollback Trigger & Success
    const verifyFailKey = uuidv4();
    // We mock createOrder to return an ID that triggers verify failure
    orderService.createOrder = async () => ({ id: 'gid://shopify/Order/verify-fail', name: '#FAIL' });
    let threwVerifyFail = false;
    try {
      await service.processAdvancePayment({
        idempotencyKey: verifyFailKey,
        draftOrderId: 'gid://shopify/DraftOrder/verify-fail',
        advanceAmount: '1000',
        currency: 'INR',
        paymentMode: 'UPI'
      }, 'req');
    } catch (err) {
      if (err instanceof OrderVerificationError) threwVerifyFail = true;
    }
    const rolledBackAttempt = attemptRepository.getById(verifyFailKey);
    const rollbackLog = db.prepare('SELECT * FROM rollback_events WHERE attempt_idempotency_key = ?').get(verifyFailKey);
    
    assert(threwVerifyFail && rolledBackAttempt.status === 'FAILED' && rollbackLog && rollbackLog.cancel_status === 'SUCCESS', 'Verification Failure & Rollback Success works');

    // 7. Rollback Failure
    const rbFailKey = uuidv4();
    orderService.createOrder = async () => ({ id: 'gid://shopify/Order/rollback-fail', name: '#RBFAIL' });
    try {
      await service.processAdvancePayment({
        idempotencyKey: rbFailKey,
        draftOrderId: 'gid://shopify/DraftOrder/rb-fail',
        advanceAmount: '1000',
        currency: 'INR',
        paymentMode: 'UPI'
      }, 'req');
    } catch (err) {}
    
    const rbFailLog = db.prepare('SELECT * FROM rollback_events WHERE attempt_idempotency_key = ?').get(rbFailKey);
    assert(rbFailLog && rbFailLog.cancel_status === 'FAILED' && rbFailLog.manual_action_required === 1, 'Rollback Failure logs manual action required');

  } catch (err) {
    console.error('\nTests crashed:', err);
  } finally {
    console.log(`\nResults: ${passCount} Passed, ${failCount} Failed\n`);
    if (failCount > 0) process.exit(1);
    
    // Clean up database for next milestones
    try {
      fs.unlinkSync('./data/partial_payment.sqlite');
      fs.unlinkSync('./data/partial_payment.sqlite-shm');
      fs.unlinkSync('./data/partial_payment.sqlite-wal');
    } catch (e) {}
  }
}

runTests();
