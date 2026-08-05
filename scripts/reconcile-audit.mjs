import 'dotenv/config';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const API = 'https://' + STORE + '/admin/api/' + VERSION + '/graphql.json';
const HEADERS = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

const query = `query($cursor: String) {
  orders(first: 250, after: $cursor, query: "status:any") {
    pageInfo { hasNextPage endCursor }
    edges { node {
      id name displayFinancialStatus displayFulfillmentStatus
      totalPriceSet { shopMoney { amount } }
      totalReceivedSet { shopMoney { amount } }
      totalOutstandingSet { shopMoney { amount } }
      totalRefundedSet { shopMoney { amount } }
    }}
  }
}`;

async function run() {
  let hasNext = true;
  let cursor = null;
  let diffSum = 0;
  let statusBreakdown = {};

  while(hasNext) {
    const res = await fetch(API, { method: 'POST', headers: HEADERS, body: JSON.stringify({ query, variables: { cursor } }) });
    const { data } = await res.json();
    
    data.orders.edges.forEach(edge => {
      const order = edge.node;
      const tPrice = parseFloat(order.totalPriceSet?.shopMoney?.amount || 0);
      const tRec = parseFloat(order.totalReceivedSet?.shopMoney?.amount || 0);
      const tOut = parseFloat(order.totalOutstandingSet?.shopMoney?.amount || 0);
      const tRef = parseFloat(order.totalRefundedSet?.shopMoney?.amount || 0);
      
      const expected = tRec + tOut; // Total Received + Total Outstanding
      const diff = tPrice - expected;
      
      if (Math.abs(diff) > 0.01) {
        diffSum += diff;
        const status = order.displayFinancialStatus || 'UNKNOWN';
        if (!statusBreakdown[status]) statusBreakdown[status] = 0;
        statusBreakdown[status] += diff;
      }
    });
    
    hasNext = data.orders.pageInfo.hasNextPage;
    cursor = data.orders.pageInfo.endCursor;
  }
  
  console.log("Total Price - (Received + Outstanding) Diff:", diffSum);
  console.table(statusBreakdown);
}

run().catch(console.error);
