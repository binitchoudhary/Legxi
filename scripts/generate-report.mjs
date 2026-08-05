import 'dotenv/config';
import { writeFileSync } from 'fs';
import * as xlsx from 'xlsx';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const API = 'https://' + STORE + '/admin/api/' + VERSION + '/graphql.json';
const HEADERS = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

const query = `query($cursor: String) {
  orders(first: 250, after: $cursor, query: "status:any") {
    pageInfo { hasNextPage endCursor }
    edges { node {
      id name createdAt displayFinancialStatus displayFulfillmentStatus
      customer { firstName lastName email }
      totalPriceSet { shopMoney { amount } }
      totalReceivedSet { shopMoney { amount } }
      totalOutstandingSet { shopMoney { amount } }
      totalRefundedSet { shopMoney { amount } }
      lineItems(first: 150) {
        edges { node {
          title
          product {
            id handle productType vendor
            collections(first: 5) { edges { node { handle title } } }
          }
        }}
      }
    }}
  }
}`;

async function getCount() {
  const res = await fetch(`https://${STORE}/admin/api/${VERSION}/orders/count.json?status=any`, { headers: HEADERS });
  const data = await res.json();
  return data.count;
}

async function run() {
  const expectedCount = await getCount();
  console.log('Expected Orders:', expectedCount);

  let hasNext = true;
  let cursor = null;
  let allOrders = [];

  while(hasNext) {
    const res = await fetch(API, { method: 'POST', headers: HEADERS, body: JSON.stringify({ query, variables: { cursor } }) });
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
    allOrders.push(...data.orders.edges.map(e => e.node));
    hasNext = data.orders.pageInfo.hasNextPage;
    cursor = data.orders.pageInfo.endCursor;
    console.log(`Fetched ${allOrders.length} orders...`);
  }

  const missing = expectedCount - allOrders.length;
  if (missing > 0) {
    console.error(`STOP: ${missing} orders are missing!`);
    return;
  }

  let heritageRows = [];
  let magshieldRows = [];
  let othersRows = [];
  let reviewRows = [];

  const createMetrics = () => ({
    TotalOrders: 0, FullyPaid: 0, PartiallyPaid: 0, Pending: 0, Refunded: 0, Voided: 0,
    TotalValue: 0, TotalReceived: 0, TotalOutstanding: 0, TotalRefunded: 0
  });

  let metrics = {
    'Heritage Minis': createMetrics(),
    'MagShield': createMetrics(),
    'Others': createMetrics()
  };

  allOrders.forEach(order => {
    let hasHeritage = false;
    let hasMagShield = false;
    let needsReview = false;
    let productsList = [];

    order.lineItems.edges.forEach(le => {
      const node = le.node;
      productsList.push(node.title);
      const title = (node.title || '').toLowerCase();
      
      let isH = false;
      let isM = false;

      if (node.product) {
        const type = (node.product.productType || '').toLowerCase();
        const handle = (node.product.handle || '').toLowerCase();
        const vendor = (node.product.vendor || '').toLowerCase();
        let cols = '';
        if (node.product.collections) {
          cols = node.product.collections.edges.map(ce => ce.node.handle).join(' ');
        }

        if (type.includes('heritage') || handle.includes('heritage-mini') || cols.includes('heritage')) isH = true;
        if (type.includes('magshield') || handle.includes('magshield') || cols.includes('magshield')) isM = true;
      }
      
      if (!isH && title.includes('heritage mini')) isH = true;
      if (!isM && title.includes('magshield')) isM = true;

      // Fallback ambiguity check
      if (!isH && !isM && !node.product) {
        if (title.includes('mini') || title.includes('shield')) {
          needsReview = true;
        }
      }

      if (isH) hasHeritage = true;
      if (isM) hasMagShield = true;
    });

    let cat = 'Others';
    if (needsReview) cat = 'Needs Review';
    else if (hasHeritage) cat = 'Heritage Minis';
    else if (hasMagShield) cat = 'MagShield';

    const tPrice = parseFloat(order.totalPriceSet?.shopMoney?.amount || 0);
    const tRec = parseFloat(order.totalReceivedSet?.shopMoney?.amount || 0);
    const tOut = parseFloat(order.totalOutstandingSet?.shopMoney?.amount || 0);
    const tRef = parseFloat(order.totalRefundedSet?.shopMoney?.amount || 0);
    const status = (order.displayFinancialStatus || '').toUpperCase();
    const fStatus = (order.displayFulfillmentStatus || '').toUpperCase();

    if (metrics[cat]) {
      metrics[cat].TotalOrders++;
      metrics[cat].TotalValue += tPrice;
      metrics[cat].TotalReceived += tRec;
      metrics[cat].TotalOutstanding += tOut;
      metrics[cat].TotalRefunded += tRef;

      if (status === 'PAID') metrics[cat].FullyPaid++;
      if (status === 'PARTIALLY_PAID') metrics[cat].PartiallyPaid++;
      if (status === 'PENDING') metrics[cat].Pending++;
      if (status === 'REFUNDED') metrics[cat].Refunded++;
      if (status === 'VOIDED') metrics[cat].Voided++;
    }

    const row = {
      'Order Number': order.name,
      'Order Date': new Date(order.createdAt).toISOString().split('T')[0],
      'Customer Name': order.customer ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() : '',
      'Customer Email': order.customer?.email || '',
      'Category': cat,
      'Financial Status': status,
      'Payment Status': status, // Note: they asked for Financial and Payment status. Shopify calls it FinancialStatus. We can output both.
      'Fulfillment Status': fStatus,
      'Order Total': tPrice,
      'Amount Received': tRec,
      'Outstanding Amount': tOut,
      'Refunded Amount': tRef,
      'Products Purchased': productsList.join(', ')
    };

    if (cat === 'Heritage Minis') heritageRows.push(row);
    else if (cat === 'MagShield') magshieldRows.push(row);
    else if (cat === 'Others') othersRows.push(row);
    else reviewRows.push(row);
  });

  const grandTotal = {
    Orders: metrics['Heritage Minis'].TotalOrders + metrics['MagShield'].TotalOrders + metrics['Others'].TotalOrders,
    Revenue: metrics['Heritage Minis'].TotalValue + metrics['MagShield'].TotalValue + metrics['Others'].TotalValue,
    Received: metrics['Heritage Minis'].TotalReceived + metrics['MagShield'].TotalReceived + metrics['Others'].TotalReceived,
    Outstanding: metrics['Heritage Minis'].TotalOutstanding + metrics['MagShield'].TotalOutstanding + metrics['Others'].TotalOutstanding,
    Refunded: metrics['Heritage Minis'].TotalRefunded + metrics['MagShield'].TotalRefunded + metrics['Others'].TotalRefunded,
  };

  let summarySheet = [
    ['Heritage Minis'],
    ['Total Orders', metrics['Heritage Minis'].TotalOrders],
    ['Fully Paid Orders', metrics['Heritage Minis'].FullyPaid],
    ['Partially Paid Orders', metrics['Heritage Minis'].PartiallyPaid],
    ['Pending Orders', metrics['Heritage Minis'].Pending],
    ['Refunded Orders', metrics['Heritage Minis'].Refunded],
    ['Voided Orders', metrics['Heritage Minis'].Voided],
    ['Total Order Value', metrics['Heritage Minis'].TotalValue],
    ['Total Amount Received', metrics['Heritage Minis'].TotalReceived],
    ['Total Outstanding', metrics['Heritage Minis'].TotalOutstanding],
    ['Total Refunded', metrics['Heritage Minis'].TotalRefunded],
    [],
    ['MagShield'],
    ['Total Orders', metrics['MagShield'].TotalOrders],
    ['Fully Paid Orders', metrics['MagShield'].FullyPaid],
    ['Partially Paid Orders', metrics['MagShield'].PartiallyPaid],
    ['Pending Orders', metrics['MagShield'].Pending],
    ['Refunded Orders', metrics['MagShield'].Refunded],
    ['Voided Orders', metrics['MagShield'].Voided],
    ['Total Order Value', metrics['MagShield'].TotalValue],
    ['Total Amount Received', metrics['MagShield'].TotalReceived],
    ['Total Outstanding', metrics['MagShield'].TotalOutstanding],
    ['Total Refunded', metrics['MagShield'].TotalRefunded],
    [],
    ['Others'],
    ['Total Orders', metrics['Others'].TotalOrders],
    ['Fully Paid Orders', metrics['Others'].FullyPaid],
    ['Partially Paid Orders', metrics['Others'].PartiallyPaid],
    ['Pending Orders', metrics['Others'].Pending],
    ['Refunded Orders', metrics['Others'].Refunded],
    ['Voided Orders', metrics['Others'].Voided],
    ['Total Order Value', metrics['Others'].TotalValue],
    ['Total Amount Received', metrics['Others'].TotalReceived],
    ['Total Outstanding', metrics['Others'].TotalOutstanding],
    ['Total Refunded', metrics['Others'].TotalRefunded],
    [],
    ['Grand Total'],
    ['Total Orders', grandTotal.Orders],
    ['Total Revenue', grandTotal.Revenue],
    ['Total Amount Received', grandTotal.Received],
    ['Total Outstanding', grandTotal.Outstanding],
    ['Total Refunded', grandTotal.Refunded],
    [],
    ['Validation'],
    ['Total Shopify Orders', expectedCount],
    ['Orders Processed', expectedCount],
    ['Orders Missing', missing]
  ];

  const wb = xlsx.utils.book_new();
  const wsSum = xlsx.utils.aoa_to_sheet(summarySheet);
  const wsHer = xlsx.utils.json_to_sheet(heritageRows);
  const wsMag = xlsx.utils.json_to_sheet(magshieldRows);
  const wsOth = xlsx.utils.json_to_sheet(othersRows);

  xlsx.utils.book_append_sheet(wb, wsSum, 'Summary');
  xlsx.utils.book_append_sheet(wb, wsHer, 'Heritage Minis Orders');
  xlsx.utils.book_append_sheet(wb, wsMag, 'MagShield Orders');
  xlsx.utils.book_append_sheet(wb, wsOth, 'Others Orders');
  
  if (reviewRows.length > 0) {
    const wsRev = xlsx.utils.json_to_sheet(reviewRows);
    xlsx.utils.book_append_sheet(wb, wsRev, 'Needs Review');
  }

  // Combine for CSV
  let allRows = [...heritageRows, ...magshieldRows, ...othersRows, ...reviewRows];
  const wsAll = xlsx.utils.json_to_sheet(allRows);
  const csvStr = xlsx.utils.sheet_to_csv(wsAll);
  
  writeFileSync('LEGXI_Category_Payment_Report.xlsx', xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  writeFileSync('LEGXI_Category_Payment_Report.csv', csvStr);

  console.log('Export Complete!');
}

run().catch(console.error);
