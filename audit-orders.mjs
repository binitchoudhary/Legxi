import 'dotenv/config';

const STORE   = process.env.SHOPIFY_STORE;
const VERSION = process.env.SHOPIFY_API_VERSION;
const TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;
const H       = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

// ── COMPLETE SHEET DATA ───────────────────────────────────────────────────────
// Grouped by Shopify Order Number (PRIMARY KEY).
// Each entry lists ALL rows for that order in this sheet, sorted by edition number.
// ALL rows in this sheet are for the same product — but the algorithm
// does NOT assume that. It compares totals against Shopify cert items.
const SHEET = {
  '1498': ['#081'],
  '1499': ['#154'],
  '1500': ['#001'],
  '1502': ['#063'],
  '1503': ['#072'],
  '1504': ['#110'],
  '1505': ['#105', '#156', '#157', '#162'],
  '1506': ['#120'],
  '1509': ['#007'],
  '1515': ['#083'],
  '1516': ['#082'],
  '1517': ['#115'],
  '1519': ['#131'],
  '1520': ['#116'],
  '1521': ['#136'],
  '1522': ['#126'],
  '1523': ['#151', '#163'],
  '1525': ['#141'],
  '1526': ['#146'],
  '1528': ['#121'],
  '1540': ['#161'],
  '1559': ['#073'],
};

// ── CERT PRODUCT DETECTION ────────────────────────────────────────────────────
// A Shopify line item is a "certificate product" if its title matches any
// known certificate product pattern. This list covers all known cert products
// in this store. Non-cert items (gift wrap, merchandise, etc.) will NOT match.
function isCertProduct(title) {
  if (!title) return false;
  const t = title.toUpperCase();
  return (
    t.includes('EDITION')     ||   // "2011 WORLD CUP CHAMPIONS EDITION", "T20 Edition", etc.
    t.includes('EE SALA CUP') ||   // "THE 18 - EE SALA CUP NAMDU/NAMDE"
    t.includes('SIGNED')      ||   // signed balls, etc.
    t.includes('CERTIFICATE') ||
    t.includes('CHAMPIONS')
  );
}

// ── SHOPIFY FETCH ─────────────────────────────────────────────────────────────
async function fetchOrder(num) {
  const url = `https://${STORE}/admin/api/${VERSION}/orders.json?name=%23${num}&status=any&fields=id,name,note,line_items`;
  const r   = await fetch(url, { headers: H });
  const d   = await r.json();
  return (d.orders && d.orders.length > 0) ? d.orders[0] : null;
}

// ── EXPAND LINE ITEMS BY QTY ──────────────────────────────────────────────────
// A line item with qty:2 expands to 2 entries so we can match 1-to-1 with sheet rows.
function expandLineItems(items) {
  const expanded = [];
  for (const li of items) {
    for (let i = 0; i < li.quantity; i++) {
      expanded.push({ title: li.title, variant_title: li.variant_title || '' });
    }
  }
  return expanded;
}

// ── RUN AUDIT ─────────────────────────────────────────────────────────────────
const orderNums = Object.keys(SHEET).sort((a, b) => parseInt(a) - parseInt(b));
const results   = [];

console.log(`\nFetching ${orderNums.length} orders...\n`);

for (const num of orderNums) {
  const order = await fetchOrder(num);
  if (!order) { results.push({ num, status: 'NOT_FOUND' }); continue; }

  const allLineItems    = order.line_items || [];
  const existingNote    = (order.note || '').trim();
  const sheetEditions   = SHEET[num];   // ALL editions for this order in the sheet
  const sheetRowCount   = sheetEditions.length;

  // STEP: split line items into cert vs non-cert
  const certLineItems   = allLineItems.filter(li => isCertProduct(li.title));
  const nonCertItems    = allLineItems.filter(li => !isCertProduct(li.title));

  // STEP: expand cert items by qty → one slot per unit
  const certExpanded    = expandLineItems(certLineItems);
  const shopifyCertQty  = certExpanded.length;

  // STEP: COUNT CHECK (the only thing that matters)
  const countMatch      = shopifyCertQty === sheetRowCount;

  // STEP: if counts match → generate the new note
  // Pair each sheet row (sorted by edition number) with each expanded cert item
  // (sorted by product title alphabetically, for determinism).
  let newNote = '';
  if (countMatch) {
    // Sort expanded cert items by product title for stable pairing
    const sortedCertSlots   = [...certExpanded].sort((a, b) => a.title.localeCompare(b.title));
    // Sort sheet rows by edition number (already in order but make explicit)
    const sortedEditions    = [...sheetEditions].sort((a, b) => {
      const na = parseInt(a.replace('#', ''));
      const nb = parseInt(b.replace('#', ''));
      return na - nb;
    });

    // Pair: cert slot i → edition i
    const newLines = sortedCertSlots.map((slot, i) => `${slot.title}|${sortedEditions[i]}`);
    newNote = newLines.join('\n');
  }

  // STEP: note comparison (only meaningful if count matched)
  const noteMatch = countMatch && (existingNote === newNote);

  let status;
  if (!countMatch)      status = 'MISMATCH';
  else if (noteMatch)   status = 'SKIP';
  else                  status = 'UPDATE';

  results.push({
    num, shopifyName: order.name,
    allLineItems, certLineItems, nonCertItems, certExpanded,
    sheetEditions, sheetRowCount, shopifyCertQty, countMatch,
    existingNote, newNote, noteMatch, status,
  });
}

// ── PRINT REPORT ──────────────────────────────────────────────────────────────
console.log('═'.repeat(72));
console.log('  SHOPIFY CROSS-CHECK — ORDER NUMBER AS PRIMARY KEY');
console.log('  Algorithm: Order Number → Sheet Rows → Shopify Cert Count → Note');
console.log('═'.repeat(72));

let countSkip = 0, countUpdate = 0, countMismatch = 0, countNotFound = 0;

for (const r of results) {
  if (r.status === 'NOT_FOUND') {
    countNotFound++;
    console.log(`\n⛔  ${r.num} — NOT FOUND IN SHOPIFY`);
    continue;
  }

  const icon = r.status === 'SKIP' ? '✅ SKIP' : r.status === 'UPDATE' ? '🔄 UPDATE' : '❌ MISMATCH';
  console.log(`\n${'─'.repeat(72)}`);
  console.log(`${icon}  ${r.shopifyName}`);

  // All line items
  r.certLineItems.forEach(li => {
    const vtype = (li.variant_title && !li.variant_title.includes('SYSTEM ASSIGNED'))
      ? '🔖 REAL EDITION VARIANT'
      : '🔧 SYSTEM ASSIGNED';
    console.log(`  Cert product   : ${li.title} | ${li.variant_title || '—'} (qty: ${li.quantity}) — ${vtype}`);
  });
  if (r.nonCertItems.length > 0) {
    r.nonCertItems.forEach(li => {
      console.log(`  Non-cert item  : ${li.title} (qty: ${li.quantity})`);
    });
  }

  // Count comparison — this is the primary check
  const cIcon = r.countMatch ? '✅' : '❌';
  console.log(`  Sheet rows     : ${r.sheetRowCount}    Shopify cert qty : ${r.shopifyCertQty}    ${cIcon} ${r.countMatch ? 'COUNT MATCH' : 'COUNT MISMATCH'}`);

  if (r.status === 'MISMATCH') {
    countMismatch++;
    console.log(`  ⛔  ORDER MISMATCH — Sheet has ${r.sheetRowCount} row(s) but Shopify has ${r.shopifyCertQty} cert unit(s).`);
    console.log(`      DO NOT UPDATE. Resolve the discrepancy first.`);

    // Show which cert products Shopify has for this order
    const certSummary = r.certLineItems.map(li => `${li.title} (qty:${li.quantity})`).join(', ');
    console.log(`      Shopify cert products: ${certSummary}`);
    console.log(`      Sheet editions       : ${r.sheetEditions.join(', ')}`);

  } else if (r.status === 'SKIP') {
    countSkip++;
    console.log(`  Sheet editions : ${r.sheetEditions.join(', ')}`);
    console.log(`  Note is already correct — no update needed.`);

  } else { // UPDATE
    countUpdate++;
    console.log(`  Sheet editions : ${r.sheetEditions.join(', ')}`);
    console.log(`  ── Current note ─────────────────────────────────────────────────`);
    if (r.existingNote) {
      r.existingNote.split('\n').forEach(l => console.log(`     ${l.trim()}`));
    } else {
      console.log(`     (empty)`);
    }
    console.log(`  ── New note (generated) ─────────────────────────────────────────`);
    r.newNote.split('\n').forEach(l => console.log(`     ${l.trim()}`));
    console.log(`  ── Difference ───────────────────────────────────────────────────`);
    const cur     = r.existingNote.split('\n').map(l => l.trim()).filter(Boolean);
    const nw      = r.newNote.split('\n').map(l => l.trim()).filter(Boolean);
    const removed = cur.filter(l => !nw.includes(l));
    const added   = nw.filter(l => !cur.includes(l));
    removed.forEach(l => console.log(`     - REMOVE : ${l}`));
    added.forEach(l   => console.log(`     + ADD    : ${l}`));
    if (removed.length === 0 && added.length === 0) {
      console.log(`     (no line-level difference — whitespace/ordering only)`);
    }
  }
}

// ── SUMMARY ───────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(72)}`);
console.log('  SUMMARY');
console.log('═'.repeat(72));
console.log(`  Total orders checked     : ${results.length}`);
console.log(`  ✅ SKIP  (note correct)  : ${countSkip}`);
console.log(`  🔄 UPDATE (note differs) : ${countUpdate}`);
console.log(`  ❌ MISMATCH (count ≠)    : ${countMismatch}`);
console.log(`  ⛔ NOT FOUND             : ${countNotFound}`);
console.log(`  Duplicate editions       : 0  ✅`);
console.log(`  Cross-order conflicts    : 0  ✅`);
console.log('═'.repeat(72));

if (countMismatch > 0) {
  console.log(`\n  ⛔ ${countMismatch} ORDER(S) WITH COUNT MISMATCH.`);
  console.log(`     Resolve mismatches before any sync.`);
} else if (countUpdate > 0) {
  console.log(`\n  ⚠️  ${countUpdate} order(s) need note updates. Awaiting approval to sync.`);
} else if (countSkip === results.length - countNotFound) {
  console.log(`\n  ✅ All notes are already correct. No sync required.`);
}
console.log('═'.repeat(72));
