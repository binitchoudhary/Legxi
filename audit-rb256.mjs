import 'dotenv/config';

const STORE   = process.env.SHOPIFY_STORE;
const VERSION = process.env.SHOPIFY_API_VERSION;
const TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;
const H       = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

// ── SHEET DATA (gid=821156670 — RB256 Signed Ball) ───────────────────────────
// Primary key: Shopify Order Number
const SHEET = {
  '1409': ['#001'],
  '1423': ['#007'],
  '1424': ['#195'],
  '1429': ['#194'],
  '1430': ['#196'],
  '1441': ['#182'],
  '1454': ['#183'],
  '1457': ['#185'],
  '1477': ['#188'],
  '1485': ['#187'],
  '1489': ['#186'],
  '1501': ['#184'],
  '1512': ['#192'],
  '1513': ['#191'],
  '1518': ['#197'],
  '1542': ['#141'],
  '1583': ['#221'],
  '1636': ['#134'],
};

async function fetchOrder(num) {
  const url = `https://${STORE}/admin/api/${VERSION}/orders.json?name=%23${num}&status=any&fields=id,name,note,line_items`;
  const r   = await fetch(url, { headers: H });
  const d   = await r.json();
  return (d.orders && d.orders.length > 0) ? d.orders[0] : null;
}

function expandByQty(items) {
  const out = [];
  for (const li of items) {
    for (let i = 0; i < li.quantity; i++) {
      out.push({ title: li.title, variant_title: li.variant_title || '' });
    }
  }
  return out;
}

// ── STEP 1: Fetch all orders ──────────────────────────────────────────────────
const orderNums = Object.keys(SHEET).sort((a, b) => parseInt(a) - parseInt(b));
const raw = [];

console.log(`\nFetching ${orderNums.length} orders from Shopify...\n`);

for (const num of orderNums) {
  const order = await fetchOrder(num);
  raw.push({ num, order });
}

// ── STEP 2: Auto-detect worksheet product ────────────────────────────────────
// The worksheet product is whichever Shopify product title appears in the
// greatest number of orders in this sheet. This avoids hardcoding any title.
const productHits = {};
for (const { order } of raw) {
  if (!order) continue;
  const seen = new Set();
  for (const li of order.line_items) {
    if (!seen.has(li.title)) {
      seen.add(li.title);
      productHits[li.title] = (productHits[li.title] || 0) + 1;
    }
  }
}
const worksheetProduct = Object.entries(productHits)
  .sort((a, b) => b[1] - a[1])[0][0];

console.log(`Worksheet product detected : "${worksheetProduct}"`);
console.log(`(appears in ${productHits[worksheetProduct]} of ${orderNums.length} orders)\n`);

// ── STEP 3: Process each order ────────────────────────────────────────────────
// Filter Shopify line items to ONLY the worksheet product.
// Ignore every other product — they belong to other worksheets.
const results = [];

for (const { num, order } of raw) {
  if (!order) { results.push({ num, status: 'NOT_FOUND' }); continue; }

  const existingNote   = (order.note || '').trim();
  const sheetEditions  = SHEET[num];
  const sheetRowCount  = sheetEditions.length;

  // Filter: only line items matching this worksheet's product
  const filteredItems  = order.line_items.filter(li => li.title === worksheetProduct);
  const otherItems     = order.line_items.filter(li => li.title !== worksheetProduct);
  const filteredExpand = expandByQty(filteredItems);
  const filteredQty    = filteredExpand.length;

  // Count comparison
  const countMatch = filteredQty === sheetRowCount;

  // Split existing note into owned lines (this product) vs other-worksheet lines
  const existingLines    = existingNote.split('\n').map(l => l.trim()).filter(Boolean);
  const ownedExisting    = existingLines.filter(l => l.startsWith(worksheetProduct + '|'));
  const otherExisting    = existingLines.filter(l => !l.startsWith(worksheetProduct + '|'));

  // Generate the owned lines from sheet data (only when counts match)
  let newOwnedLines = [];
  if (countMatch && filteredQty > 0) {
    const sortedEditions = [...sheetEditions].sort(
      (a, b) => parseInt(a.replace('#', '')) - parseInt(b.replace('#', ''))
    );
    newOwnedLines = sortedEditions.map(ed => `${worksheetProduct}|${ed}`);
  }

  // Full note = other-worksheet lines preserved + new owned lines
  const fullNewNote = [...otherExisting, ...newOwnedLines].join('\n');

  // Status is determined by comparing ONLY the owned portion
  // Other-worksheet lines are never modified — they are invisible to this audit
  const ownedMatch = countMatch &&
    JSON.stringify([...ownedExisting].sort()) === JSON.stringify([...newOwnedLines].sort());

  const generatedNote = fullNewNote;

  let status;
  if (!countMatch)  status = 'MISMATCH';
  else if (ownedMatch) status = 'SKIP';
  else                 status = 'UPDATE';

  results.push({
    num,
    shopifyName:   order.name,
    filteredItems,
    otherItems,
    filteredQty,
    sheetEditions,
    sheetRowCount,
    countMatch,
    existingNote,
    generatedNote,
    noteMatch: ownedMatch,
    status,
  });
}

// ── PRINT REPORT ──────────────────────────────────────────────────────────────
console.log('═'.repeat(72));
console.log(`  AUDIT — RB256 SIGNED BALL (gid=821156670)`);
console.log(`  Worksheet product : "${worksheetProduct}"`);
console.log(`  Primary key       : Shopify Order Number`);
console.log('═'.repeat(72));

let countSkip = 0, countUpdate = 0, countMismatch = 0, countNotFound = 0;

for (const r of results) {
  if (r.status === 'NOT_FOUND') {
    countNotFound++;
    console.log(`\n⛔  Order ${r.num} — NOT FOUND IN SHOPIFY`);
    continue;
  }

  const icon = r.status === 'SKIP'   ? '✅ SKIP'
             : r.status === 'UPDATE' ? '🔄 UPDATE'
             :                         '❌ MISMATCH';

  console.log(`\n${'─'.repeat(72)}`);
  console.log(`${icon}  ${r.shopifyName}`);

  // Show worksheet product line items
  r.filteredItems.forEach(li => {
    const vt = li.variant_title && !li.variant_title.toLowerCase().includes('system assigned')
      ? `🔖 REAL — ${li.variant_title}`
      : `🔧 SYSTEM ASSIGNED`;
    console.log(`  ✔ Worksheet product : ${li.title} (qty:${li.quantity}) — ${vt}`);
  });

  // Show other products (ignored for this audit)
  r.otherItems.forEach(li => {
    console.log(`  ○ Other product     : ${li.title} (qty:${li.quantity}) — belongs to another worksheet, ignored`);
  });

  const cIcon = r.countMatch ? '✅' : '❌';
  console.log(`  Sheet rows   : ${r.sheetRowCount}   Filtered Shopify qty : ${r.filteredQty}   ${cIcon} ${r.countMatch ? 'COUNT MATCH' : 'COUNT MISMATCH'}`);
  console.log(`  Sheet edns   : ${r.sheetEditions.join(', ')}`);

  if (r.status === 'MISMATCH') {
    countMismatch++;
    console.log(`  ⛔  MISMATCH — sheet has ${r.sheetRowCount} row(s) for this product but Shopify has ${r.filteredQty}.`);
    console.log(`      DO NOT SYNC. Resolve first.`);
  } else if (r.status === 'SKIP') {
    countSkip++;
    console.log(`  Current note : ${r.existingNote}`);
    console.log(`  Generated    : ${r.generatedNote}`);
    console.log(`  ✅ Note already correct — no update needed.`);
  } else {
    countUpdate++;
    console.log(`  Current note : ${r.existingNote || '(empty)'}`);
    console.log(`  Generated    : ${r.generatedNote}`);
    const cur     = r.existingNote.split('\n').map(l => l.trim()).filter(Boolean);
    const nw      = r.generatedNote.split('\n').map(l => l.trim()).filter(Boolean);
    const removed = cur.filter(l => !nw.includes(l));
    const added   = nw.filter(l => !cur.includes(l));
    if (removed.length) removed.forEach(l => console.log(`  - REMOVE : ${l}`));
    if (added.length)   added.forEach(l   => console.log(`  + ADD    : ${l}`));
    if (!removed.length && !added.length)
      console.log(`  (content identical — whitespace/ordering only)`);
  }
}

// ── GLOBAL VALIDATION ─────────────────────────────────────────────────────────
const allEditions = Object.values(SHEET).flat();
const uniqueEditions = new Set(allEditions);
const hasDupes = allEditions.length !== uniqueEditions.size;
const editionToOrder = {};
let crossConflict = false;
for (const [ord, eds] of Object.entries(SHEET)) {
  for (const ed of eds) {
    if (editionToOrder[ed] && editionToOrder[ed] !== ord) crossConflict = true;
    editionToOrder[ed] = ord;
  }
}

console.log(`\n${'═'.repeat(72)}`);
console.log('  GLOBAL VALIDATION');
console.log('═'.repeat(72));
console.log(`  Total sheet rows      : ${allEditions.length}`);
console.log(`  Unique editions       : ${uniqueEditions.size}`);
console.log(`  Duplicate editions    : ${hasDupes       ? '❌ YES' : '0  ✅'}`);
console.log(`  Cross-order conflicts : ${crossConflict  ? '❌ YES' : '0  ✅'}`);

console.log(`\n${'═'.repeat(72)}`);
console.log('  SUMMARY');
console.log('═'.repeat(72));
console.log(`  Total orders checked        : ${results.length}`);
console.log(`  ✅ SKIP  (note correct)     : ${countSkip}`);
console.log(`  🔄 UPDATE (note missing)    : ${countUpdate}`);
console.log(`  ❌ MISMATCH (count ≠)       : ${countMismatch}`);
console.log(`  ⛔ NOT FOUND in Shopify     : ${countNotFound}`);
console.log('═'.repeat(72));

const allClear = countMismatch === 0 && countNotFound === 0 && !hasDupes && !crossConflict;

if (allClear && countUpdate === 0) {
  console.log('\n  ✅ Shopify Verified');
  console.log('  ✅ Sheet Matches Shopify');
  console.log('  ✅ Safe to Sync Order Notes');
} else if (allClear && countUpdate > 0) {
  console.log('\n  ✅ Shopify Verified');
  console.log('  ✅ Sheet Matches Shopify');
  console.log(`  ⚠️  ${countUpdate} order(s) need notes written — awaiting your approval to sync.`);
} else {
  console.log('\n  ❌ Verification Failed');
  if (countMismatch > 0) console.log(`     ${countMismatch} order(s) with count mismatch.`);
  if (countNotFound > 0) console.log(`     ${countNotFound} order(s) not found in Shopify.`);
  if (hasDupes)          console.log(`     Duplicate editions in sheet.`);
  if (crossConflict)     console.log(`     Same edition in multiple orders.`);
}
console.log('═'.repeat(72));
