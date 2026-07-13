// =============================================================================
// POC — Approach B: orderCreate directly, with a partial SALE transaction embedded
//                    at creation time
// =============================================================================
//
// Pipeline under test:
//   1. orderCreate — create a ₹10,000 order in a single call, with a `transactions`
//      array containing one SALE / SUCCESS transaction of ₹1,000.
//
// HYPOTHESIS UNDER TEST (per Shopify's docs, NOT verified by execution until you run this):
//   Unlike orderCreateManualPayment (Approach A, step 3), the `transactions` input on
//   orderCreate carries no documented Plus restriction anywhere in its schema or docs.
//   If Shopify's own financial-status math ("Partially paid" = a captured amount less
//   than the full order value) applies here the same way it does everywhere else, this
//   single call should produce an order that is immediately displayFinancialStatus:
//   PARTIALLY_PAID, with totalReceivedSet = 1000.00 and totalOutstandingSet = 9000.00.
//   This script does not assume that outcome — it prints the raw response so you can
//   read whatever Shopify actually returns.
//
// Requirements for this mutation (per Shopify docs):
//   - write_orders access scope
//   - an OFFLINE access token (orderCreate rejects online/session tokens) — the custom-app
//     admin API token in this project's .env is an offline token by definition, so this
//     should not be a blocker.
//
// Usage:
//   node approach-b.mjs
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
    console.log('!!! GraphQL top-level errors (query/transport problem, not a userError):');
    console.log(JSON.stringify(body.errors, null, 2));
  }

  return { httpStatus: response.status, body };
}

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
  const orderCreateMutation = `
    mutation orderCreate($order: OrderCreateOrderInput!) {
      orderCreate(order: $order) {
        order { id name displayFinancialStatus }
        userErrors { field message }
      }
    }`;
  const orderCreateVariables = {
    order: {
      email: 'poc-test-customer@example.com',
      currency: 'INR',
      tags: ['POC-TEST', 'DO-NOT-FULFILL'],
      lineItems: [
        {
          title: 'POC Test Product',
          priceSet: { shopMoney: { amount: '10000.00', currencyCode: 'INR' } },
          quantity: 1
        }
      ],
      // The one field under test: a SALE transaction for LESS than the order total.
      transactions: [
        {
          kind: 'SALE',
          status: 'SUCCESS',
          amountSet: { shopMoney: { amount: '1000.00', currencyCode: 'INR' } }
        }
      ]
    }
  };

  const step1 = await callGraphQL('STEP 1: orderCreate (₹10,000 order, ₹1,000 SALE transaction)', orderCreateMutation, orderCreateVariables);
  const step1Payload = step1.body?.data?.orderCreate;
  reportUserErrors('orderCreate', step1Payload);

  const orderId = step1Payload?.order?.id;
  if (!orderId) {
    console.log('\nABORTED: orderCreate did not return an order id. See response above for the exact error.');
    return;
  }

  console.log('\n========== APPROACH B SUMMARY ==========');
  console.log('Order ID:', orderId);
  console.log('Order name:', step1Payload.order.name);
  console.log('displayFinancialStatus at creation:', step1Payload.order.displayFinancialStatus);
  console.log(`\nNext: node verify-order.mjs "${orderId}"`);
}

run().catch(err => {
  console.error('\nFATAL ERROR (transport/network failure, not a Shopify userError):');
  console.error(err);
});
