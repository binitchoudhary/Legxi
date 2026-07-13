import 'dotenv/config';

const STORE   = process.env.SHOPIFY_STORE;
const VERSION = process.env.SHOPIFY_API_VERSION;
const TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;
const H       = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

// ── SHEET DATA — sample orders from each tab ──────────────────────────────────
// Source: fetched fresh from each worksheet via gviz API.
// Each entry lists a few order numbers from the sheet — enough to detect the product.
// Tab name is only an INTERNAL LABEL. Product is determined from Shopify data.
const SHEETS = {
  'RCB ARTWORK':         ['1498','1499','1500','1502','1503','1504'],
  '2026 WC Artwork':     ['1442','1443','1451','1466','1473','1559'],
  'RB256 Signed Ball':   ['1409','1423','1424','1441','1454','1457'],
  '2007 WC ARTWORK':     ['1396','1420','1446','1483','1488','1514'],
  '2011 WC Artwork':     ['1373','1401','1402','1455','1495','1547'],
  '1983 Artwork':        ['1347','1401','1411','1420','1426','1446'],
  'GOD OF CRICKET':      ['1215','1514','1332','1400','1307','1282'],
  'AS 02 BALL':          ['1192','1287','1264','1283','1390','1376'],
  'AS 02 Signed ARTWORK':['1384'],
  'SI96 Signed ARTWORK': ['1152'],
  'AS02 CAP':            ['1322','1345'],
};

async function fetchOrder(num) {
  const url = `https://${STORE}/admin/api/${VERSION}/orders.json?name=%23${num}&status=any&fields=id,name,note,line_items`;
  const r   = await fetch(url, { headers: H });
  const d   = await r.json();
  return (d.orders && d.orders.length > 0) ? d.orders[0] : null;
}

const productMap = {};  // tabName → detected Shopify product title

console.log('\nBuilding product map...\n');

for (const [tabName, sampleOrders] of Object.entries(SHEETS)) {
  // Count how many sample orders each product appears in
  const productHits = {};

  for (const num of sampleOrders) {
    const order = await fetchOrder(num);
    if (!order) continue;
    const seen = new Set();
    for (const li of order.line_items) {
      if (!seen.has(li.title)) {
        seen.add(li.title);
        productHits[li.title] = (productHits[li.title] || 0) + 1;
      }
    }
  }

  if (Object.keys(productHits).length === 0) {
    productMap[tabName] = { product: null, reason: 'no orders found in Shopify' };
    continue;
  }

  // The worksheet product = product appearing in the MOST sample orders
  const sorted  = Object.entries(productHits).sort((a, b) => b[1] - a[1]);
  const detected = sorted[0][0];
  const hitCount = sorted[0][1];

  productMap[tabName] = {
    product:  detected,
    hitCount,
    sampleSize: sampleOrders.length,
    allProducts: sorted,
  };
}

// ── PRINT PRODUCT MAP ─────────────────────────────────────────────────────────
console.log('═'.repeat(72));
console.log('  PRODUCT MAP — Worksheet → Shopify Product');
console.log('  Detected automatically from Shopify order data');
console.log('  Worksheet tab names are NOT used as product names');
console.log('═'.repeat(72));

for (const [tabName, info] of Object.entries(productMap)) {
  if (!info.product) {
    console.log(`\n⚠️  ${tabName}`);
    console.log(`   → ${info.reason}`);
    continue;
  }
  console.log(`\n  Tab     : "${tabName}"`);
  console.log(`  Product : "${info.product}"`);
  console.log(`  Signal  : appears in ${info.hitCount}/${info.sampleSize} sampled orders`);
  if (info.allProducts.length > 1) {
    console.log(`  Others  : ${info.allProducts.slice(1).map(([t,n]) => `"${t}" (${n}/${info.sampleSize})`).join(', ')}`);
  }
}

console.log(`\n${'═'.repeat(72)}`);
console.log('  SUMMARY TABLE');
console.log('═'.repeat(72));
console.log(`  ${'Tab Name'.padEnd(26)} → Product`);
console.log(`  ${'─'.repeat(68)}`);
for (const [tabName, info] of Object.entries(productMap)) {
  console.log(`  ${tabName.padEnd(26)} → ${info.product || '(not found)'}`);
}
console.log('═'.repeat(72));
