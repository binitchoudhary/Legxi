import 'dotenv/config';
import { writeFileSync } from 'fs';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const API = 'https://' + STORE + '/admin/api/' + VERSION + '/graphql.json';
const HEADERS = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

async function getCount() {
  const res = await fetch('https://' + STORE + '/admin/api/' + VERSION + '/orders/count.json?status=any', { headers: HEADERS });
  const data = await res.json();
  return data.count;
}

const query = `query($cursor: String) {
  orders(first: 250, after: $cursor, query: "status:any") {
    pageInfo { hasNextPage endCursor }
    edges { node {
      id name createdAt email
      displayFinancialStatus displayFulfillmentStatus
      totalPriceSet { shopMoney { amount } }
      totalReceivedSet { shopMoney { amount } }
      totalOutstandingSet { shopMoney { amount } }
      totalRefundedSet { shopMoney { amount } }
      transactions(first: 100) {
        gateway status kind amountSet { shopMoney { amount } }
      }
      tags
      customer { firstName lastName email }
      lineItems(first: 250) {
        edges { node {
          title quantity sku variant { title }
          discountAllocations { allocatedAmountSet { shopMoney { amount } } }
        }}
      }
    }}
  }
}`;

async function runAudit() {
  console.log('Starting audit...');
  const expectedCount = await getCount();
  console.log('Expected Orders Count:', expectedCount);

  let orders = [];
  let hasNext = true;
  let cursor = null;

  while(hasNext) {
    const res = await fetch(API, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ query, variables: { cursor } })
    });
    if (!res.ok) {
      console.log('API Error:', res.status, await res.text());
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }
    const { data, errors } = await res.json();
    if (errors) {
       console.log('GQL Errors:', errors);
       break;
    }
    
    const pageInfo = data.orders.pageInfo;
    const edges = data.orders.edges;
    orders.push(...edges.map(e => e.node));
    console.log('Fetched ' + orders.length + ' orders...');
    
    hasNext = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
  }
  
  if (orders.length !== expectedCount) {
    console.log('WARNING: Expected ' + expectedCount + ', got ' + orders.length);
  }
  
  writeFileSync('audit-data.json', JSON.stringify({ expectedCount, orders }, null, 2));
  console.log('Saved audit-data.json');
}
runAudit().catch(console.error);
