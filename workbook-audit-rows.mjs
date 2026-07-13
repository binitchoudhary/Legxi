/**
 * workbook-audit-rows.mjs — LEGXI Row-Based Workbook Audit
 *
 * ONE audit result per worksheet row. 241 rows = 241 results.
 * Every row classified as SKIP / UPDATE / CLEANUP / INVALID.
 *
 * The old audit had a bug: if an order had a count-mismatch in ANY tab,
 * the entire order was skipped (via `continue`) — note checks for other tabs
 * of the same order were never run. This script evaluates each row independently.
 *
 * CANONICAL RULES (unchanged):
 *   1. Worksheet tab name = Shopify product title (exact, 1:1, no inference).
 *   2. Order Number is the ONLY primary key.
 *   3. No Shopify writes in this script — audit only.
 */

import 'dotenv/config';
import { writeFileSync } from 'fs';

const STORE          = process.env.SHOPIFY_STORE;
const API_VERSION    = process.env.SHOPIFY_API_VERSION;
const TOKEN          = process.env.SHOPIFY_ADMIN_TOKEN;
const H              = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };
const SPREADSHEET_ID = '1D6qTb58W9_SREE5pxiHxEgqzHfRZLO9OB-x0e3yHSNA';

const SHEET_TABS = [
  'THE 18 - EE SALA CUP NAMDU',
  'World T20 Champions Edition - 2026',
  'Ravi Bishnoi: Official Hand-Signed Ball',
  "2007 : The Birth of India's T20 Era",
  'THE 2011 WORLD CUP CHAMPIONS EDITION',
  '1983 World Cup Edition : Become the Belief',
  'God of Cricket : 100 Centuries Edition',
  'Hand Signed Ball | AS02',
  'Arshdeep Singh Hand Signed 24 Carat Gold Edition',
  'Shreyas Iyer Hand-Signed White Gold-Plated Artwork',
  'AS02 Player Edition Cap : Arshdeep Singh',
];

// Authoritative worksheet-tab → Shopify product title mapping.
// Used ONLY to match Shopify line items. Note lines are ALWAYS written using
// the worksheet tab name (left-hand key), which is the canonical certificate
// display name. The right-hand value is never written into notes.
const PRODUCT_MAP = {
  'THE 18 - EE SALA CUP NAMDU':                        'THE 18 - EE SALA CUP NAMDU',
  'World T20 Champions Edition - 2026':                 'World Champions 2026 - T20 Edition',
  'Ravi Bishnoi: Official Hand-Signed Ball':            'Ravi Bishnoi: Official Hand-Signed Ball',
  "2007 : The Birth of India's T20 Era":                "2007 : The Birth of India's T20 Era",
  'THE 2011 WORLD CUP CHAMPIONS EDITION':               '2011 WORLD CUP CHAMPIONS EDITION',
  '1983 World Cup Edition : Become the Belief':         '1983 WC : Become the Belief',
  'God of Cricket : 100 Centuries Edition':             'God of Cricket : 100 Centuries Edition',
  'Hand Signed Ball | AS02':                            'Arshdeep Singh : Official Hand-Signed Leather Ball',
  'Arshdeep Singh Hand Signed 24 Carat Gold Edition':   'Arshdeep Singh Hand Signed 24 kt Gold Edition',
  'Shreyas Iyer Hand-Signed White Gold-Plated Artwork': 'Shreyas Iyer Hand-Signed White Gold-Plated Artwork',
  'AS02 Player Edition Cap : Arshdeep Singh':           'AS02 Player Edition Cap : Arshdeep Singh',
};

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function parseGvizJson(text) {
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON in gviz response');
  return JSON.parse(text.slice(start, end + 1));
}

function fmtEdition(raw) {
  const n = parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
  if (isNaN(n)) return null;
  return '#' + String(n).padStart(3, '0');
}

// Returns the product-title prefix of a note line.
// Uses lastIndexOf so titles that contain '|' (e.g. "Hand Signed Ball | AS02") work correctly.
function notePrefix(line) {
  const i = line.lastIndexOf('|');
  return i !== -1 ? line.slice(0, i).trim() : null;
}

// Normalise Unicode smart-quotes to ASCII — for comparison only.
// Uses \uXXXX escapes so characters are never corrupted by editors or copy-paste.
const normQ = s =>
  s.replace(/[‘’‚‛]/g, "'")
   .replace(/[“”„‟]/g, '"');

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v).replace(/\r?\n/g, ' | ');
  if (s.includes(',') || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const HR = '═'.repeat(72);
const hr = '─'.repeat(72);

// ═══════════════════════════════════════════════════════════════════════════════
//  GOOGLE SHEETS — fetch rows from one worksheet tab
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchSheetRows(tabName) {
  const url  = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = parseGvizJson(await resp.text());
  if (data.status === 'error') {
    const msg = data.errors?.[0]?.detailed_message || data.errors?.[0]?.message || 'sheet not found';
    throw new Error(`gviz: ${msg}`);
  }
  const table = data.table;
  if (!table?.rows) return [];

  const cols = table.cols || [];
  let editionCol = 0, orderCol = 4;
  for (let i = 0; i < cols.length; i++) {
    const lbl = (cols[i].label || '').toLowerCase().replace(/[^a-z ]/g, '').trim();
    if (lbl.includes('edition') && (lbl.includes('number') || i < 2)) editionCol = i;
    if (lbl.includes('order') && lbl.includes('number')) orderCol = i;
  }

  const rows = [];
  for (let ri = 0; ri < table.rows.length; ri++) {
    const row = table.rows[ri];
    if (!row.c) continue;
    const cell = idx => {
      const c = row.c[idx];
      if (!c) return null;
      const v = (c.v !== null && c.v !== undefined) ? String(c.v).trim() : null;
      const f = (c.f !== null && c.f !== undefined) ? String(c.f).trim() : null;
      return f || v;
    };
    const rawEd    = cell(editionCol);
    const rawOrder = cell(orderCol);
    if (!rawEd || !rawOrder) continue;
    const edNum  = rawEd.replace(/[^0-9]/g, '');
    const ordNum = rawOrder.replace(/[^0-9]/g, '');
    if (!edNum || !ordNum || ordNum.length < 3) continue;
    const edition = fmtEdition(edNum);
    if (!edition) continue;
    // sheetRowIndex: +2 accounts for 1-based indexing + the header row
    rows.push({ edition, orderNum: ordNum, sheetRowIndex: ri + 2 });
  }
  return rows;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SHOPIFY — cached order fetch with retry
// ═══════════════════════════════════════════════════════════════════════════════

const _cache = {};

async function fetchOrder(num) {
  if (_cache[num] !== undefined) return _cache[num];
  const url = `https://${STORE}/admin/api/${API_VERSION}/orders.json?name=%23${num}&status=any&fields=id,name,note,line_items`;
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const r = await fetch(url, { headers: H });
      const d = await r.json();
      _cache[num] = (d.orders?.length > 0) ? d.orders[0] : null;
      return _cache[num];
    } catch (e) {
      lastErr = e;
      const wait = attempt * 2000;
      process.stdout.write(`    ⚠ #${num} attempt ${attempt} failed (${e.cause?.code || e.message}) — retry in ${wait}ms\n`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════════

console.log(`\n${HR}`);
console.log('  LEGXI ROW-BASED WORKBOOK AUDIT');
console.log('  One result per worksheet row. Every row must end in exactly one state.');
console.log(`  States: SKIP / UPDATE / CLEANUP / INVALID`);
console.log(HR);

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 1 — Read every worksheet
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n  STEP 1: Reading all worksheets...\n');

const tabRows         = {};  // tabName → [{ edition, orderNum, sheetRowIndex }]
let   totalSheetRows  = 0;

for (const tab of SHEET_TABS) {
  try {
    const rows = await fetchSheetRows(tab);
    tabRows[tab]   = rows;
    totalSheetRows += rows.length;
    console.log(`  ✔  "${tab}"  →  ${rows.length} row(s)`);
  } catch (e) {
    tabRows[tab] = [];
    console.log(`  ✘  "${tab}"  →  ERROR: ${e.message}`);
  }
}

console.log(`\n  Total worksheet rows: ${totalSheetRows}`);

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 2 — Collect & fetch all Shopify orders
// ─────────────────────────────────────────────────────────────────────────────
const allOrderNums = new Set();
for (const rows of Object.values(tabRows)) rows.forEach(r => allOrderNums.add(r.orderNum));

console.log(`\n  STEP 2: ${allOrderNums.size} unique order numbers — fetching from Shopify...`);

let fetchedCount = 0;
const sortedNums = [...allOrderNums].sort((a, b) => parseInt(a) - parseInt(b));
for (const num of sortedNums) {
  await fetchOrder(num);
  fetchedCount++;
  if (fetchedCount % 20 === 0) process.stdout.write(`  ${fetchedCount} fetched...\n`);
  await new Promise(r => setTimeout(r, 150));
}
process.stdout.write(`  Done — ${fetchedCount} fetched.\n`);

const notFoundNums = sortedNums.filter(n => _cache[n] === null);
if (notFoundNums.length) console.log(`  Orders not found in Shopify: ${notFoundNums.join(', ')}`);

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 3 — Row-by-row audit (one result per worksheet row)
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${HR}`);
console.log('  STEP 3: ROW-BY-ROW AUDIT');
console.log(`  Each row validated independently. No order-level grouping.`);
console.log(HR);

/*
 * STATUS DEFINITIONS
 * SKIP    — expected note line present exactly once, product confirmed in order
 * UPDATE  — expected note line absent, product IS in order (note needs line added)
 * CLEANUP — expected note line present 2+ times (duplicate, needs dedup)
 * INVALID — product NOT found in Shopify order line items (data error in sheet)
 */

const auditRows  = [];  // one entry per worksheet row
const csvRows    = [];  // non-SKIP rows for the CSV export

let countSkip    = 0;
let countUpdate  = 0;
let countCleanup = 0;
let countInvalid = 0;

for (const tab of SHEET_TABS) {
  const rows = tabRows[tab] || [];

  console.log(`\n${hr}`);
  console.log(`  "${tab}"  (${rows.length} rows)`);
  console.log(hr);

  let tabSkip = 0, tabUpdate = 0, tabCleanup = 0, tabInvalid = 0;

  for (const { edition, orderNum, sheetRowIndex } of rows) {
    const order = _cache[orderNum];

    // ── Order not found in Shopify ──────────────────────────────────────────
    if (!order) {
      tabInvalid++; countInvalid++;
      const note = `INVALID — order #${orderNum} not found in Shopify`;
      console.log(`  ⛔  Row ${sheetRowIndex}: #${orderNum} ${edition}  →  ${note}`);
      auditRows.push({ tab, sheetRow: sheetRowIndex, orderNum, edition, status: 'INVALID',
                       reason: 'Order not found in Shopify', expectedLine: `${tab}|${edition}`, currentNote: '' });
      csvRows.push({ Worksheet: tab, 'Row Number': sheetRowIndex, 'Order Number': orderNum,
                     'Edition Number': edition, 'Expected Note Line': `${tab}|${edition}`,
                     'Current Shopify Note': '', 'Required Action': 'INVALID — order not found in Shopify' });
      continue;
    }

    // ── Check if this tab's product is in the order's line items ───────────
    // Resolve tab → Shopify product title via PRODUCT_MAP, then match line items.
    // Expected note line always uses the WORKSHEET TAB NAME, not the Shopify title.
    const lineItems    = order.line_items || [];
    const shopifyTitle = PRODUCT_MAP[tab] || tab;
    const matchedItems = lineItems.filter(li => normQ(li.title) === normQ(shopifyTitle));
    const shopifyQty   = matchedItems.reduce((n, li) => n + li.quantity, 0);
    const expectedLine = `${tab}|${edition}`;
    const expectedNorm = normQ(expectedLine);

    if (shopifyQty === 0) {
      // Product not in this Shopify order — data discrepancy in sheet
      tabInvalid++; countInvalid++;
      const actualTitles = lineItems.map(li => `"${li.title}"`).join(', ');
      const reason = `Product "${shopifyTitle}" not in order. Actual line items: ${actualTitles || '(none)'}`;
      const mappedNote = shopifyTitle !== tab ? ` (mapped: "${shopifyTitle}")` : '';
      console.log(`  ⛔  Row ${sheetRowIndex}: #${orderNum} ${edition}  →  INVALID — product not in order${mappedNote}`);
      console.log(`       Shopify has: ${actualTitles || '(no line items)'}`);
      auditRows.push({ tab, sheetRow: sheetRowIndex, orderNum, edition, status: 'INVALID',
                       reason, expectedLine, currentNote: order.note || '' });
      csvRows.push({ Worksheet: tab, 'Row Number': sheetRowIndex, 'Order Number': orderNum,
                     'Edition Number': edition, 'Expected Note Line': expectedLine,
                     'Current Shopify Note': order.note || '',
                     'Required Action': `INVALID — product not in order; Shopify has: ${actualTitles || 'none'}` });
      continue;
    }

    // ── Product IS in order — validate the note line ────────────────────────
    const rawNote    = order.note || '';
    const noteLines  = rawNote.split('\n').map(l => l.trim()).filter(Boolean);
    const occurrences = noteLines.filter(l => normQ(l) === expectedNorm).length;

    if (occurrences === 1) {
      // Correct — exactly one matching line
      tabSkip++; countSkip++;
      console.log(`  ✅  Row ${sheetRowIndex}: #${orderNum} ${edition}  →  SKIP (correct)`);
      auditRows.push({ tab, sheetRow: sheetRowIndex, orderNum, edition, status: 'SKIP',
                       expectedLine, currentNote: rawNote });

    } else if (occurrences === 0) {
      // Missing — expected line not in note
      tabUpdate++; countUpdate++;
      const noteDisplay = rawNote ? rawNote.replace(/\n/g, ' | ') : '(empty)';
      console.log(`  📝  Row ${sheetRowIndex}: #${orderNum} ${edition}  →  UPDATE — line missing from note`);
      console.log(`       Current note: ${noteDisplay}`);
      console.log(`       Expected add: ${expectedLine}`);
      auditRows.push({ tab, sheetRow: sheetRowIndex, orderNum, edition, status: 'UPDATE',
                       reason: 'Expected note line missing', expectedLine, currentNote: rawNote });
      csvRows.push({ Worksheet: tab, 'Row Number': sheetRowIndex, 'Order Number': orderNum,
                     'Edition Number': edition, 'Expected Note Line': expectedLine,
                     'Current Shopify Note': rawNote,
                     'Required Action': `UPDATE — add: ${expectedLine}` });

    } else {
      // Duplicate — expected line appears more than once
      tabCleanup++; countCleanup++;
      console.log(`  🧹  Row ${sheetRowIndex}: #${orderNum} ${edition}  →  CLEANUP — line appears ${occurrences}x in note`);
      auditRows.push({ tab, sheetRow: sheetRowIndex, orderNum, edition, status: 'CLEANUP',
                       reason: `Line appears ${occurrences}x in note`, expectedLine, currentNote: rawNote });
      csvRows.push({ Worksheet: tab, 'Row Number': sheetRowIndex, 'Order Number': orderNum,
                     'Edition Number': edition, 'Expected Note Line': expectedLine,
                     'Current Shopify Note': rawNote,
                     'Required Action': `CLEANUP — deduplicate (appears ${occurrences}x)` });
    }
  }

  const tabTotal = tabSkip + tabUpdate + tabCleanup + tabInvalid;
  console.log(`\n  Tab total ${tabTotal}: SKIP=${tabSkip}  UPDATE=${tabUpdate}  CLEANUP=${tabCleanup}  INVALID=${tabInvalid}`);
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 4 — Also check for WRONG-PRODUCT note lines (lines that exist for
//  a known LEGXI product that is NOT in this order — should be removed)
//  These appear as notes pollution; they are tracked per-order, not per-row.
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n${HR}`);
console.log('  STEP 4: WRONG-PRODUCT NOTE LINE CHECK');
console.log('  (Existing note lines for known products NOT in this order)');
console.log(HR);

const allKnownTitlesNorm = new Set(SHEET_TABS.map(normQ));

// Build the set of (orderNum, productTitle) pairs confirmed by the sheet
const sheetConfirmed = new Set();
for (const [tab, rows] of Object.entries(tabRows)) {
  for (const { orderNum } of rows) {
    sheetConfirmed.add(`${orderNum}||${normQ(tab)}`);
  }
}

const wrongProductOrders = [];

for (const orderNum of sortedNums) {
  const order = _cache[orderNum];
  if (!order || !order.note) continue;

  const noteLines = (order.note || '').split('\n').map(l => l.trim()).filter(Boolean);
  const wrongLines = noteLines.filter(line => {
    const p = notePrefix(line);
    if (!p) return false;
    const pNorm = normQ(p);
    // Line is for a known LEGXI product...
    if (!allKnownTitlesNorm.has(pNorm)) return false;
    // ...but this order is NOT in the sheet for that product
    return !sheetConfirmed.has(`${orderNum}||${pNorm}`);
  });

  if (wrongLines.length > 0) {
    wrongProductOrders.push({ orderNum, wrongLines, currentNote: order.note });
    console.log(`  ⚠️  #${orderNum}  —  wrong-product lines in note:`);
    wrongLines.forEach(l => console.log(`       REMOVE: ${l}`));
  }
}

if (wrongProductOrders.length === 0) {
  console.log('  No wrong-product note lines found.');
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 5 — Coverage validation
// ─────────────────────────────────────────────────────────────────────────────
const totalClassified = countSkip + countUpdate + countCleanup + countInvalid;
const balanced        = totalClassified === totalSheetRows;

console.log(`\n${HR}`);
console.log('  COVERAGE VALIDATION');
console.log(HR);
console.log(`  Workbook rows read        : ${totalSheetRows}`);
console.log(`  Rows classified           : ${totalClassified}  ${balanced ? '✅ BALANCED' : '❌ DOES NOT BALANCE'}`);
console.log(`  ✅  SKIP    (correct)       : ${countSkip}`);
console.log(`  📝  UPDATE  (missing line)  : ${countUpdate}`);
console.log(`  🧹  CLEANUP (duplicate)     : ${countCleanup}`);
console.log(`  ⛔  INVALID (data mismatch) : ${countInvalid}`);
console.log(`\n  Equation: ${countSkip} + ${countUpdate} + ${countCleanup} + ${countInvalid} = ${totalClassified} / ${totalSheetRows}  ${balanced ? '✅' : '❌'}`);
console.log(`  Shopify orders fetched    : ${fetchedCount}`);
console.log(`  Orders not in Shopify     : ${notFoundNums.length}`);
console.log(HR);

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 6 — Final modification list (by order, across all tabs)
// ─────────────────────────────────────────────────────────────────────────────
const modRows = auditRows.filter(r => r.status !== 'SKIP');
const modOrderNums = [...new Set(modRows.map(r => r.orderNum))].sort((a, b) => parseInt(a) - parseInt(b));

// Also include wrong-product orders
const allModOrders = [...new Set([...modOrderNums, ...wrongProductOrders.map(o => o.orderNum)])].sort((a, b) => parseInt(a) - parseInt(b));

console.log(`\n  FINAL ORDER MODIFICATION LIST  (${allModOrders.length} orders)`);
console.log(HR);

for (const num of allModOrders) {
  const rows = modRows.filter(r => r.orderNum === num);
  const wrongProd = wrongProductOrders.find(o => o.orderNum === num);

  console.log(`\n  #${num}`);

  // Group rows by status
  const updates  = rows.filter(r => r.status === 'UPDATE');
  const cleanups = rows.filter(r => r.status === 'CLEANUP');
  const invalids = rows.filter(r => r.status === 'INVALID');

  if (updates.length)  updates.forEach(r  => console.log(`    📝 UPDATE  [${r.tab}] ${r.edition}  →  ADD: ${r.expectedLine}`));
  if (cleanups.length) cleanups.forEach(r => console.log(`    🧹 CLEANUP [${r.tab}] ${r.edition}  →  DEDUP: ${r.expectedLine}`));
  if (invalids.length) invalids.forEach(r  => console.log(`    ⛔ INVALID [${r.tab}] ${r.edition}  →  ${r.reason.split('.')[0]}`));
  if (wrongProd)       wrongProd.wrongLines.forEach(l => console.log(`    ✂️ REMOVE  ${l}`));

  if (updates.length || cleanups.length || wrongProd) {
    const order = _cache[num];
    const currentNote = order?.note || '(empty)';
    console.log(`    Current note: ${currentNote.replace(/\n/g, ' | ')}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 7 — Per-worksheet summary table
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${HR}`);
console.log('  PER-WORKSHEET SUMMARY');
console.log(HR);
console.log('  Worksheet                                           Rows  Skip  Upd  Clean  Inv');
console.log('  ' + '─'.repeat(85));

for (const tab of SHEET_TABS) {
  const tabAudit  = auditRows.filter(r => r.tab === tab);
  const total   = tabAudit.length;
  const skip    = tabAudit.filter(r => r.status === 'SKIP').length;
  const upd     = tabAudit.filter(r => r.status === 'UPDATE').length;
  const cln     = tabAudit.filter(r => r.status === 'CLEANUP').length;
  const inv     = tabAudit.filter(r => r.status === 'INVALID').length;
  const label   = tab.length > 50 ? tab.slice(0, 47) + '...' : tab;
  console.log(`  ${label.padEnd(50)} ${String(total).padStart(4)}  ${String(skip).padStart(4)}  ${String(upd).padStart(3)}  ${String(cln).padStart(5)}  ${String(inv).padStart(3)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 8 — CSV export
// ─────────────────────────────────────────────────────────────────────────────
const csvHeaders = [
  'Worksheet', 'Row Number', 'Order Number', 'Edition Number',
  'Expected Note Line', 'Current Shopify Note', 'Required Action'
];

// Add wrong-product rows to CSV
for (const { orderNum, wrongLines, currentNote } of wrongProductOrders) {
  for (const line of wrongLines) {
    const alreadyInCsv = csvRows.some(r => r['Order Number'] === orderNum && r['Required Action'].includes(line));
    if (!alreadyInCsv) {
      csvRows.push({
        Worksheet:            '(existing note)',
        'Row Number':         '',
        'Order Number':       orderNum,
        'Edition Number':     '',
        'Expected Note Line': '',
        'Current Shopify Note': currentNote,
        'Required Action':    `REMOVE wrong-product line: ${line}`,
      });
    }
  }
}

const csvContent = [
  csvHeaders.join(','),
  ...csvRows.map(r => csvHeaders.map(h => csvEscape(r[h])).join(',')),
].join('\n');

writeFileSync('audit_missing_notes.csv', csvContent, 'utf8');
console.log(`\n  CSV saved →  audit_missing_notes.csv  (${csvRows.length} action rows)`);
console.log('\n  DO NOT SYNC. This is an audit-only pass.\n');
