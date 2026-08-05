import 'dotenv/config';
import { writeFileSync } from 'fs';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const API = 'https://' + STORE + '/admin/api/' + VERSION + '/graphql.json';
const HEADERS = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

const query = `query($cursor: String) {
  orders(first: 250, after: $cursor, query: "status:any") {
    pageInfo { hasNextPage endCursor }
    edges { node {
      id name displayFinancialStatus tags
      totalPriceSet { shopMoney { amount currencyCode } presentmentMoney { amount currencyCode } }
      totalReceivedSet { shopMoney { amount } }
      totalOutstandingSet { shopMoney { amount } }
      totalRefundedSet { shopMoney { amount } }
      transactions(first: 50) { gateway kind status }
      lineItems(first: 250) {
        edges { node { title variant { sku } discountAllocations { allocatedAmountSet { shopMoney { amount } } } } }
      }
    }}
  }
}`;

async function run() {
  let hasNext = true;
  let cursor = null;
  let allOrders = [];

  while(hasNext) {
    const res = await fetch(API, { method: 'POST', headers: HEADERS, body: JSON.stringify({ query, variables: { cursor } }) });
    const { data } = await res.json();
    data.orders.edges.forEach(edge => allOrders.push(edge.node));
    hasNext = data.orders.pageInfo.hasNextPage;
    cursor = data.orders.pageInfo.endCursor;
  }

  let buckets = {
    'Draft / Manual Pending': { count: 0, price: 0, received: 0, outstanding: 0, refunded: 0, diff: 0 },
    'COD': { count: 0, price: 0, received: 0, outstanding: 0, refunded: 0, diff: 0 },
    'Bank Transfer': { count: 0, price: 0, received: 0, outstanding: 0, refunded: 0, diff: 0 },
    'Voided': { count: 0, price: 0, received: 0, outstanding: 0, refunded: 0, diff: 0 },
    'Refunded': { count: 0, price: 0, received: 0, outstanding: 0, refunded: 0, diff: 0 },
    'Partially Refunded': { count: 0, price: 0, received: 0, outstanding: 0, refunded: 0, diff: 0 },
    'Multi-currency': { count: 0, price: 0, received: 0, outstanding: 0, refunded: 0, diff: 0 },
    'Discount Adjustments': { count: 0, price: 0, received: 0, outstanding: 0, refunded: 0, diff: 0 },
    'Other Paid Variances': { count: 0, price: 0, received: 0, outstanding: 0, refunded: 0, diff: 0 }
  };

  let discrepancies = [];
  let nonInrFound = false;
  let ambiguousTitles = 0;

  allOrders.forEach(order => {
    const tPrice = parseFloat(order.totalPriceSet?.shopMoney?.amount || 0);
    const tRec = parseFloat(order.totalReceivedSet?.shopMoney?.amount || 0);
    const tOut = parseFloat(order.totalOutstandingSet?.shopMoney?.amount || 0);
    const tRef = parseFloat(order.totalRefundedSet?.shopMoney?.amount || 0);
    const diff = tPrice - (tRec + tOut + tRef);

    if (order.totalPriceSet?.shopMoney?.currencyCode !== 'INR' || order.totalPriceSet?.presentmentMoney?.currencyCode !== 'INR') {
      nonInrFound = true;
    }

    let hasAmbiguous = false;
    order.lineItems.edges.forEach(le => {
      const title = (le.node.title || '').toLowerCase();
      if (!title.includes('heritage mini') && !title.includes('magshield')) {
        if (title.includes('mini') || title.includes('shield')) hasAmbiguous = true;
      }
    });
    if (hasAmbiguous) ambiguousTitles++;

    if (Math.abs(diff) > 0.01) {
      let b = 'Other Paid Variances';
      const status = order.displayFinancialStatus || '';
      
      const gateways = order.transactions.map(t => t.gateway.toLowerCase()).join(' ');
      const isCod = gateways.includes('cod') || gateways.includes('cash on delivery') || (order.tags && order.tags.includes('COD'));
      const isBank = gateways.includes('bank') || gateways.includes('manual');
      const isDraft = order.tags && order.tags.includes('Draft');
      const hasDiscount = order.lineItems.edges.some(le => le.node.discountAllocations.length > 0);

      if (status === 'VOIDED') b = 'Voided';
      else if (status === 'REFUNDED') b = 'Refunded';
      else if (status === 'PARTIALLY_REFUNDED') b = 'Partially Refunded';
      else if (status === 'PENDING') {
        if (isCod) b = 'COD';
        else if (isBank) b = 'Bank Transfer';
        else b = 'Draft / Manual Pending';
      } else if (status === 'PAID') {
        if (order.totalPriceSet?.shopMoney?.currencyCode !== order.totalPriceSet?.presentmentMoney?.currencyCode) b = 'Multi-currency';
        else if (hasDiscount) b = 'Discount Adjustments';
      }

      const bk = buckets[b];
      bk.count++; bk.price += tPrice; bk.received += tRec; bk.outstanding += tOut; bk.refunded += tRef; bk.diff += diff;

      discrepancies.push({
        order: order.name, price: tPrice, received: tRec, outstanding: tOut, refunded: tRef, status, diff, reason: b
      });
    }
  });

  discrepancies.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  const top20 = discrepancies.slice(0, 20);

  let md = `# Audit Validation Evidence\n\n## 1 & 2. Bucket Breakdown\n`;
  md += `| Bucket | Orders | Total Price | Received | Outstanding | Refunded | Net Diff |\n|---|---|---|---|---|---|---|\n`;
  let totalDiff = 0;
  for (const [name, b] of Object.entries(buckets)) {
    if (b.count > 0) {
      md += `| ${name} | ${b.count} | ₹${b.price.toFixed(2)} | ₹${b.received.toFixed(2)} | ₹${b.outstanding.toFixed(2)} | ₹${b.refunded.toFixed(2)} | ₹${b.diff.toFixed(2)} |\n`;
      totalDiff += b.diff;
    }
  }
  md += `| **TOTAL SUM** | | | | | | **₹${totalDiff.toFixed(2)}** |\n`;

  md += `\n## 3. Top 20 Discrepancy Orders\n`;
  md += `| Order | Price | Received | Outstanding | Refunded | Status | Diff | Reason |\n|---|---|---|---|---|---|---|---|\n`;
  top20.forEach(o => {
    md += `| ${o.order} | ${o.price} | ${o.received} | ${o.outstanding} | ${o.refunded} | ${o.status} | ${o.diff.toFixed(2)} | ${o.reason} |\n`;
  });

  md += `\n## 4. Shopify Markets\n- Non-INR shopMoney or presentmentMoney values detected? **${nonInrFound ? 'Yes' : 'No'}**\n`;

  md += `\n## 5. Category Classification\n- Classification was performed **strictly by string matching on product titles**. Product Type, Handle, and Collection were not queried.\n`;
  md += `- **Ambiguous Orders (contained 'mini' or 'shield' but not exact match):** ${ambiguousTitles}\n`;

  writeFileSync('audit-evidence.md', md);
  console.log("Done");
}

run().catch(console.error);
