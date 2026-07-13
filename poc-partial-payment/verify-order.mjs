// =============================================================================
// POC — verify-order.mjs: inspect an order's financial status, transactions,
//                          timeline events, and Admin URL.
// =============================================================================
//
// Run this after approach-a.mjs or approach-b.mjs, passing the order id it printed.
//
// NOTE on "Financial Status" vs "Display Financial Status":
//   The GraphQL Admin API does NOT expose two separate fields for this. There is only
//   `displayFinancialStatus` on the Order object — confirmed directly against Shopify's
//   Order object docs, which list no separate `financialStatus` field (that name only
//   exists as a snake_case `financial_status` string in the older REST Admin API).
//   This script queries `displayFinancialStatus` once and prints it under both labels
//   below so nothing is silently missing from the output you asked for — it is not two
//   independent data points, it is the same value.
//
// Usage:
//   node verify-order.mjs "gid://shopify/Order/1234567890"
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
  console.error('Usage: node verify-order.mjs "gid://shopify/Order/1234567890"');
  process.exit(1);
}

const query = `
  query verifyOrder($id: ID!) {
    order(id: $id) {
      id
      name
      legacyResourceId
      displayFinancialStatus
      totalPriceSet { shopMoney { amount currencyCode } }
      totalReceivedSet { shopMoney { amount currencyCode } }
      totalOutstandingSet { shopMoney { amount currencyCode } }
      transactions {
        id
        kind
        status
        amountSet { shopMoney { amount currencyCode } }
        processedAt
        gateway
      }
      events(first: 20, sortKey: CREATED_AT) {
        nodes {
          id
          createdAt
          action
          message
        }
      }
    }
  }`;

async function run() {
  console.log('--- GraphQL query sent ---');
  console.log(query.trim());
  console.log('--- Variables sent ---');
  console.log(JSON.stringify({ id: orderId }, null, 2));

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ query, variables: { id: orderId } })
  });
  const body = await response.json();

  console.log(`--- Raw HTTP response (status ${response.status}) ---`);
  console.log(JSON.stringify(body, null, 2));

  if (body.errors) {
    console.log('!!! GraphQL top-level errors:');
    console.log(JSON.stringify(body.errors, null, 2));
    return;
  }

  const order = body?.data?.order;
  if (!order) {
    console.log('\nNo order returned — the id is likely wrong or the order is inaccessible with this token.');
    return;
  }

  const adminUrl = `https://${STORE}/admin/orders/${order.legacyResourceId}`;

  console.log('\n========== SUMMARY ==========');
  console.log('Order:', order.name, `(${order.id})`);
  console.log('Order URL in Shopify Admin:', adminUrl);
  console.log('Financial Status:', order.displayFinancialStatus, '  <- see note at top of this file');
  console.log('Display Financial Status:', order.displayFinancialStatus, '  <- same field, see note at top of this file');
  console.log('Order Total:', order.totalPriceSet.shopMoney.amount, order.totalPriceSet.shopMoney.currencyCode);
  console.log('Paid Amount (totalReceivedSet):', order.totalReceivedSet.shopMoney.amount, order.totalReceivedSet.shopMoney.currencyCode);
  console.log('Outstanding Balance (totalOutstandingSet):', order.totalOutstandingSet.shopMoney.amount, order.totalOutstandingSet.shopMoney.currencyCode);

  console.log('\n--- Transactions (' + order.transactions.length + ') ---');
  for (const t of order.transactions) {
    console.log(`  - ${t.kind} / ${t.status} | ${t.amountSet.shopMoney.amount} ${t.amountSet.shopMoney.currencyCode} | gateway: ${t.gateway} | processedAt: ${t.processedAt}`);
  }

  console.log('\n--- Timeline events (' + order.events.nodes.length + ') ---');
  for (const e of order.events.nodes) {
    console.log(`  - [${e.createdAt}] ${e.action}: ${e.message}`);
  }

  console.log('\nNOTE: "Send Invoice" and "Mark as Paid" buttons are native Admin UI, rendered');
  console.log('based on displayFinancialStatus — they are not returned by this API and cannot');
  console.log('be checked programmatically. Open the Order URL above in a browser to confirm');
  console.log('their presence visually.');
}

run().catch(err => {
  console.error('\nFATAL ERROR (transport/network failure):');
  console.error(err);
});
