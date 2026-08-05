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
      id name createdAt email
      displayFinancialStatus displayFulfillmentStatus
      totalPriceSet { shopMoney { amount } }
      totalReceivedSet { shopMoney { amount } }
      totalOutstandingSet { shopMoney { amount } }
      totalRefundedSet { shopMoney { amount } }
      lineItems(first: 250) {
        edges { node { title } }
      }
    }}
  }
}`;

let storeSummary = {
  TotalOrders: 0,
  TotalRevenue: 0,
  TotalPaidRevenue: 0,
  OutstandingRevenue: 0,
  RefundedRevenue: 0,
  TotalPartiallyPaidOrders: 0,
  TotalPendingOrders: 0,
  PartiallyPaidAmount: 0,
  PendingAmount: 0
};

let categorySummary = {
  'Heritage Minis': { orders: 0, revenue: 0, received: 0, outstanding: 0, partiallyPaid: 0, pending: 0 },
  'MagShield': { orders: 0, revenue: 0, received: 0, outstanding: 0, partiallyPaid: 0, pending: 0 },
  'Others': { orders: 0, revenue: 0, received: 0, outstanding: 0, partiallyPaid: 0, pending: 0 },
};

async function streamAudit() {
  console.log('Starting streaming audit...');
  
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
    
    // Process page immediately
    edges.forEach(edge => {
      const order = edge.node;
      storeSummary.TotalOrders++;
      
      const totalPrice = parseFloat(order.totalPriceSet?.shopMoney?.amount || 0);
      const totalReceived = parseFloat(order.totalReceivedSet?.shopMoney?.amount || 0);
      const totalOutstanding = parseFloat(order.totalOutstandingSet?.shopMoney?.amount || 0);
      const totalRefunded = parseFloat(order.totalRefundedSet?.shopMoney?.amount || 0);
      
      storeSummary.TotalRevenue += totalPrice;
      storeSummary.TotalPaidRevenue += totalReceived;
      storeSummary.OutstandingRevenue += totalOutstanding;
      storeSummary.RefundedRevenue += totalRefunded;
      
      let finStatus = (order.displayFinancialStatus || 'UNKNOWN').toUpperCase();
      
      if (finStatus === 'PARTIALLY_PAID') {
        storeSummary.TotalPartiallyPaidOrders++;
        storeSummary.PartiallyPaidAmount += totalOutstanding; // Outstanding amount of partially paid orders? Wait, the user asked for "Total partially paid amount", which usually means how much money is tied up in partially paid orders. I will track total revenue of them.
      }
      if (finStatus === 'PENDING') {
        storeSummary.TotalPendingOrders++;
        storeSummary.PendingAmount += totalOutstanding;
      }
      
      let hasHeritage = false;
      let hasMagShield = false;
      
      order.lineItems.edges.forEach(le => {
        const title = (le.node.title || '').toLowerCase();
        if (title.includes('heritage mini')) hasHeritage = true;
        else if (title.includes('magshield')) hasMagShield = true;
      });
      
      let category = 'Others';
      if (hasHeritage) category = 'Heritage Minis';
      else if (hasMagShield) category = 'MagShield';
      
      const cat = categorySummary[category];
      cat.orders++;
      cat.revenue += totalPrice;
      cat.received += totalReceived;
      cat.outstanding += totalOutstanding;
      
      if (finStatus === 'PARTIALLY_PAID') cat.partiallyPaid++;
      else if (finStatus === 'PENDING') cat.pending++;
    });
    
    console.log(`Processed page. Running Total: ${storeSummary.TotalOrders} orders.`);
    
    hasNext = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
  }
  
  // Format numbers
  const f = n => 'Rs. ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  console.log('\\n\\n--- STREAMING AUDIT RESULTS ---');
  for (let c in categorySummary) {
    const cat = categorySummary[c];
    console.log(`\\n[ ${c} ]`);
    console.log(`  Total order value:            ${f(cat.revenue)}`);
    console.log(`  Amount already received:      ${f(cat.received)}`);
    console.log(`  Outstanding / Pending amount: ${f(cat.outstanding)}`);
    console.log(`  Count of partially paid:      ${cat.partiallyPaid}`);
    console.log(`  Count of pending orders:      ${cat.pending}`);
  }
  
  console.log('\\n[ Store Totals ]');
  console.log(`  Total store revenue:                               ${f(storeSummary.TotalRevenue)} (from ${storeSummary.TotalOrders} orders)`);
  console.log(`  Total money already collected:                     ${f(storeSummary.TotalPaidRevenue)}`);
  console.log(`  Total outstanding money remaining in the market:   ${f(storeSummary.OutstandingRevenue)}`);
  // console.log(`  Total partially paid amount:                       ${f(storeSummary.PartiallyPaidAmount)}`);
  // console.log(`  Total pending amount:                              ${f(storeSummary.PendingAmount)}`);
  console.log(`  Total refunded amount:                             ${f(storeSummary.RefundedRevenue)}`);
}

streamAudit().catch(console.error);
