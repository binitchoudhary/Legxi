import { attemptRepository } from './src/repositories/attemptRepository.js';
import { rollbackRepository } from './src/repositories/rollbackRepository.js';
import db from './src/database/db.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

console.log('\n--- Repository Tests ---\n');

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

try {
  const idemKey = uuidv4();

  // Test 1: Insert
  const newAttempt = attemptRepository.create({
    idempotencyKey: idemKey,
    draftOrderId: 'gid://shopify/DraftOrder/123',
    advanceAmount: '1000.00',
    currency: 'INR',
    paymentMode: 'UPI',
    staffNote: 'Test note',
    status: 'PENDING'
  });
  assert(newAttempt.idempotencyKey === idemKey && newAttempt.status === 'PENDING', 'Insert works');

  // Test 2: Lookup
  const lookup = attemptRepository.getById(idemKey);
  assert(lookup && lookup.idempotencyKey === idemKey, 'Lookup works');

  // Test 3: Update
  const updated = attemptRepository.update(idemKey, { status: 'SUCCESS', orderId: 'gid://shopify/Order/456' });
  assert(updated.status === 'SUCCESS' && updated.orderId === 'gid://shopify/Order/456' && updated.completedAt !== null, 'Update works');

  // Test 4: Failed Lookup
  const failedLookup = attemptRepository.getById('non-existent-key');
  assert(failedLookup === null, 'Failed lookup works');

  // Test 5: Rollback logging
  const rollbackEvent = rollbackRepository.create({
    attemptIdempotencyKey: idemKey,
    orderId: 'gid://shopify/Order/456',
    reason: 'Test rollback',
    cancelStatus: 'SUCCESS',
    archiveStatus: 'FAILED',
    manualActionRequired: false
  });
  assert(rollbackEvent && rollbackEvent.reason === 'Test rollback' && rollbackEvent.manualActionRequired === false, 'Rollback event logging works');

  // Test 6: Transaction rollback
  // Create a transaction that inserts an attempt then throws an error.
  const failingTransaction = db.transaction((key) => {
    attemptRepository.create({
      idempotencyKey: key,
      draftOrderId: 'gid://shopify/DraftOrder/999',
      advanceAmount: '500.00',
      currency: 'INR',
      paymentMode: 'CASH',
      status: 'PENDING'
    });
    throw new Error('Simulated failure');
  });

  const failKey = uuidv4();
  let threw = false;
  try {
    failingTransaction(failKey);
  } catch (err) {
    threw = true;
  }
  
  const failLookup = attemptRepository.getById(failKey);
  assert(threw && failLookup === null, 'Transaction rollback works');

} catch (err) {
  console.error('\nTests crashed:', err);
}

console.log(`\nResults: ${passCount} Passed, ${failCount} Failed\n`);
// Clean up database for next milestones
try {
    fs.unlinkSync('./data/partial_payment.sqlite');
    fs.unlinkSync('./data/partial_payment.sqlite-shm');
    fs.unlinkSync('./data/partial_payment.sqlite-wal');
} catch (e) {}

if (failCount > 0) process.exit(1);
