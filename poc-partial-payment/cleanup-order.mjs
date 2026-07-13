// =============================================================================
// POC — cleanup-order.mjs: cancel a test order, then try to delete it, and if
//                           deletion isn't supported for that order's state,
//                           archive it instead (orderClose).
// =============================================================================
//
// Chain: orderCancel -> orderDelete (best-effort) -> orderClose (fallback archive)
//
// Why this order:
//   - orderCancel is the always-safe, always-applicable action: voids authorizations,
//     restocks, and marks the order CANCELLED. It does not remove the order from the
//     order list.
//   - orderDelete only works for orders meeting specific Shopify-defined criteria
//     (see https://help.shopify.com/manual/orders/cancel-delete-order#delete-an-order).
//     A cancelled test order with a real transaction on it is likely NOT eligible —
//     this script does not assume either way, it tries and reports the real result.
//   - orderClose ("archive") has no such restriction — if delete is rejected, this is
//     the guaranteed fallback so the test order at least disappears from the default
//     Orders view.
//
// Usage:
//   node cleanup-order.mjs "gid://shopify/Order/1234567890"
// =============================================================================

import 'dotenv/config';

const STORE = process.env.SHOPIFY_STORE;
const VERSION = process.env.SHOPIFY_API_VERSION;
const ENDPOINT = `https://${STORE}/admin/api/${VERSION}/graphql.json`;
const HEADERS = {
  'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN,
  'Content-Type': 'application/json'
};

const orderId = process.argv[2];
if (!orderId) {
  console.error('Usage: node cleanup-order.mjs "gid://shopify/Order/1234567890"');
  process.exit(1);
}

async function callGraphQL(mutationLabel, query, variables) {
  console.log(`\n########## ${mutationLabel} ##########`);
  console.log('--- GraphQL mutation sent ---');
  console.log(query.trim());
  console.log('--- Variables sent ---');
  console.log(JSON.stringify(variables, null, 2));

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ query, variables })
  });
  const body = await response.json();

  console.log(`--- Raw HTTP response (status ${response.status}) ---`);
  console.log(JSON.stringify(body, null, 2));

  if (body.errors) {
    console.log('!!! GraphQL top-level errors:');
    console.log(JSON.stringify(body.errors, null, 2));
  }

  return { httpStatus: response.status, body };
}

function reportUserErrors(mutationName, payload, errorFieldName = 'userErrors') {
  const userErrors = payload?.[errorFieldName] ?? [];
  if (userErrors.length === 0) {
    console.log(`No userErrors returned by ${mutationName}.`);
    return userErrors;
  }
  console.log(`!!! ${mutationName} returned ${userErrors.length} userError(s):`);
  for (const err of userErrors) {
    console.log(`  - field: ${JSON.stringify(err.field)} | message: ${err.message}`);
  }
  return userErrors;
}

async function run() {
  // ---------------------------------------------------------------------
  // STEP 1: cancel the order
  // ---------------------------------------------------------------------
  const cancelMutation = `
    mutation orderCancel($orderId: ID!, $notifyCustomer: Boolean, $refundMethod: OrderCancelRefundMethodInput!, $restock: Boolean!, $reason: OrderCancelReason!, $staffNote: String) {
      orderCancel(orderId: $orderId, notifyCustomer: $notifyCustomer, refundMethod: $refundMethod, restock: $restock, reason: $reason, staffNote: $staffNote) {
        job { id done }
        orderCancelUserErrors { field message code }
        userErrors { field message }
      }
    }`;
  const cancelVariables = {
    orderId,
    notifyCustomer: false,
    refundMethod: { originalPaymentMethodsRefund: true },
    restock: true,
    reason: 'OTHER',
    staffNote: 'POC test order cleanup'
  };
  const step1 = await callGraphQL('STEP 1: orderCancel', cancelMutation, cancelVariables);
  const step1Payload = step1.body?.data?.orderCancel;
  reportUserErrors('orderCancel (userErrors)', step1Payload, 'userErrors');
  reportUserErrors('orderCancel (orderCancelUserErrors)', step1Payload, 'orderCancelUserErrors');

  // ---------------------------------------------------------------------
  // STEP 2: best-effort delete
  // ---------------------------------------------------------------------
  const deleteMutation = `
    mutation orderDelete($orderId: ID!) {
      orderDelete(orderId: $orderId) {
        deletedId
        userErrors { field message }
      }
    }`;
  const step2 = await callGraphQL('STEP 2: orderDelete (best-effort)', deleteMutation, { orderId });
  const step2Payload = step2.body?.data?.orderDelete;
  const deleteErrors = reportUserErrors('orderDelete', step2Payload, 'userErrors');
  const deleted = !!step2Payload?.deletedId && deleteErrors.length === 0;

  if (deleted) {
    console.log('\n========== CLEANUP SUMMARY ==========');
    console.log('Order was CANCELLED and DELETED. No further action needed.');
    return;
  }

  // ---------------------------------------------------------------------
  // STEP 3: fallback — archive (orderClose) since delete was rejected
  // ---------------------------------------------------------------------
  console.log('\norderDelete did not succeed — falling back to orderClose (archive).');
  const closeMutation = `
    mutation orderClose($input: OrderCloseInput!) {
      orderClose(input: $input) {
        order { id closed closedAt }
        userErrors { field message }
      }
    }`;
  const step3 = await callGraphQL('STEP 3: orderClose (archive fallback)', closeMutation, { input: { id: orderId } });
  const step3Payload = step3.body?.data?.orderClose;
  reportUserErrors('orderClose', step3Payload, 'userErrors');

  console.log('\n========== CLEANUP SUMMARY ==========');
  console.log('Order was CANCELLED.');
  console.log('Delete: FAILED (see STEP 2 above for why).');
  console.log('Archive (orderClose) result: closed =', step3Payload?.order?.closed, '| closedAt =', step3Payload?.order?.closedAt);
}

run().catch(err => {
  console.error('\nFATAL ERROR (transport/network failure):');
  console.error(err);
});
