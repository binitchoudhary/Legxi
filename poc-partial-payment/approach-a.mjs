// =============================================================================
// POC — Approach A: Draft Order -> complete unpaid -> record manual partial payment
// =============================================================================
//
// Pipeline under test:
//   1. draftOrderCreate      — build a draft order with a dummy customer + one ₹10,000 line item
//   2. draftOrderComplete    — convert the draft into a real Order, WITHOUT marking it paid
//                              (paymentPending: true — this argument is flagged "Deprecated"
//                              in Shopify's schema docs but is still present and functional
//                              as of the API version in .env; there is no documented
//                              replacement argument as of this writing)
//   3. orderCreateManualPayment — attempt to record a ₹1,000 offline payment against the
//                              now-existing, now-unpaid order
//
// KNOWN RISK (per Shopify's own docs, NOT verified by execution until you run this):
//   orderCreateManualPayment's `amount` input field carries this exact documented sentence:
//     "The API client must be installed on a Shopify Plus store to use the amount field."
//   On a non-Plus ("Grow") store, step 3 is expected to return a userError rather than
//   silently recording the ₹1,000. This script does not assume that outcome — it prints
//   the raw response so you can read whatever Shopify actually says.
//
// Every GraphQL mutation is printed in full BEFORE it's sent, and the full raw response
// (including any userErrors array) is printed immediately after.
//
// Usage:
//   node approach-a.mjs
//
// Requires a .env file (see README.md) with:
//   SHOPIFY_STORE, SHOPIFY_ADMIN_TOKEN, SHOPIFY_API_VERSION
// Token scopes needed: write_draft_orders, write_orders
// =============================================================================

import 'dotenv/config';

const STORE = process.env.SHOPIFY_STORE;
const VERSION = process.env.SHOPIFY_API_VERSION;
const ENDPOINT = `https://${STORE}/admin/api/${VERSION}/graphql.json`;
const HEADERS = {
  'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN,
  'Content-Type': 'application/json'
};

if (!STORE || !process.env.SHOPIFY_ADMIN_TOKEN || !VERSION) {
  console.error('Missing SHOPIFY_STORE / SHOPIFY_ADMIN_TOKEN / SHOPIFY_API_VERSION in .env — see README.md.');
  process.exit(1);
}

// Sends one GraphQL request and returns { httpStatus, body }. Never throws on GraphQL-level
// errors (userErrors) — only on transport failure — so the caller can always print what
// Shopify actually said.
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

  // Surface GraphQL-level top-level errors (bad query syntax, auth failure, etc.)
  if (body.errors) {
    console.log('!!! GraphQL top-level errors (query/transport problem, not a userError):');
    console.log(JSON.stringify(body.errors, null, 2));
  }

  return { httpStatus: response.status, body };
}

// Pulls the userErrors array out of a mutation payload and prints each one explicitly,
// regardless of whether the mutation "succeeded" at the HTTP level.
function reportUserErrors(mutationName, payload) {
  const userErrors = payload?.userErrors ?? [];
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
  // STEP 1: create a draft order — dummy customer, single ₹10,000 line item
  // ---------------------------------------------------------------------
  const draftOrderCreateMutation = `
    mutation draftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder { id name }
        userErrors { field message }
      }
    }`;
  const draftOrderCreateVariables = {
    input: {
      email: 'poc-test-customer@example.com',
      tags: ['POC-TEST', 'DO-NOT-FULFILL'],
      note: 'POC test order — Approach A (draft order + manual partial payment)',
      lineItems: [
        { title: 'POC Test Product', originalUnitPrice: '10000.00', quantity: 1 }
      ]
    }
  };
  const step1 = await callGraphQL('STEP 1: draftOrderCreate', draftOrderCreateMutation, draftOrderCreateVariables);
  const step1Payload = step1.body?.data?.draftOrderCreate;
  reportUserErrors('draftOrderCreate', step1Payload);

  const draftOrderId = step1Payload?.draftOrder?.id;
  if (!draftOrderId) {
    console.log('\nABORTED: draftOrderCreate did not return a draft order id. See response above.');
    return;
  }
  console.log(`\ndraftOrder created: ${draftOrderId} (${step1Payload.draftOrder.name})`);

  // ---------------------------------------------------------------------
  // STEP 2: complete the draft order WITHOUT marking it paid
  // ---------------------------------------------------------------------
  const draftOrderCompleteMutation = `
    mutation draftOrderComplete($id: ID!, $paymentPending: Boolean) {
      draftOrderComplete(id: $id, paymentPending: $paymentPending) {
        draftOrder { id order { id name } }
        userErrors { field message }
      }
    }`;
  const draftOrderCompleteVariables = { id: draftOrderId, paymentPending: true };
  const step2 = await callGraphQL('STEP 2: draftOrderComplete (paymentPending: true)', draftOrderCompleteMutation, draftOrderCompleteVariables);
  const step2Payload = step2.body?.data?.draftOrderComplete;
  reportUserErrors('draftOrderComplete', step2Payload);

  const orderId = step2Payload?.draftOrder?.order?.id;
  if (!orderId) {
    console.log('\nABORTED: draftOrderComplete did not return an order id. See response above.');
    return;
  }
  console.log(`\nOrder created: ${orderId} (${step2Payload.draftOrder.order.name})`);

  // ---------------------------------------------------------------------
  // STEP 3: attempt to record a ₹1,000 manual/offline payment against the order
  // ---------------------------------------------------------------------
  const manualPaymentMutation = `
    mutation orderCreateManualPayment($id: ID!, $amount: MoneyInput, $paymentMethodName: String) {
      orderCreateManualPayment(id: $id, amount: $amount, paymentMethodName: $paymentMethodName) {
        order { id displayFinancialStatus }
        userErrors { field message }
      }
    }`;
  const manualPaymentVariables = {
    id: orderId,
    amount: { amount: '1000.00', currencyCode: 'INR' },
    paymentMethodName: 'Cash (POC test)'
  };
  const step3 = await callGraphQL('STEP 3: orderCreateManualPayment (₹1,000)', manualPaymentMutation, manualPaymentVariables);
  const step3Payload = step3.body?.data?.orderCreateManualPayment;
  const step3Errors = reportUserErrors('orderCreateManualPayment', step3Payload);

  // ---------------------------------------------------------------------
  // FINAL SUMMARY
  // ---------------------------------------------------------------------
  console.log('\n========== APPROACH A SUMMARY ==========');
  console.log('Order ID:', orderId);
  console.log('Order name:', step2Payload.draftOrder.order.name);
  console.log('Manual payment step succeeded:', step3Errors.length === 0 && !!step3Payload?.order);
  console.log(`\nNext: node verify-order.mjs "${orderId}"`);
}

run().catch(err => {
  console.error('\nFATAL ERROR (transport/network failure, not a Shopify userError):');
  console.error(err);
});
