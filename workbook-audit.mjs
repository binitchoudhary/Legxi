/**
 * workbook-audit.mjs — LEGXI Workbook Audit v3
 *
 * CANONICAL RULES:
 *   1. Worksheet tab name  =  Shopify product title  (exact, 1:1, no inference).
 *   2. Order Number is the ONLY primary key.
 *   3. Products are NEVER auto-detected, inferred, or aliased.
 *   4. Every line item in every order is inspected before any decision is made.
 *   5. All non-workbook note lines (customer text, unrelated products) are preserved.
 *   6. No Shopify writes until the user explicitly approves.
 */

import 'dotenv/config';
import { writeFileSync } from 'fs';

const STORE          = process.env.SHOPIFY_STORE;
const API_VERSION    = process.env.SHOPIFY_API_VERSION;
const TOKEN          = process.env.SHOPIFY_ADMIN_TOKEN;
const H              = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };
const SPREADSHEET_ID = '1D6qTb58W9_SREE5pxiHxEgqzHfRZLO9OB-x0e3yHSNA';

// ═════════════════════════════════════════════════════════════════════════════
//  WORKSHEET TAB NAMES  =  SHOPIFY PRODUCT TITLES
//  ⚠  Every entry here must match EXACTLY:
//      (a) The worksheet tab name in Google Sheets
//      (b) The product title as it appears in Shopify line items
//  No aliases. No variants. No inference. This array is the single source of truth.
// ═════════════════════════════════════════════════════════════════════════════
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

// ═════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═════════════════════════════════════════════════════════════════════════════

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

// Normalise Unicode smart-quotes to ASCII equivalents -- for comparison only.
// Uses \uXXXX escapes so characters are never corrupted by editors or copy-paste.
const normQ = s =>
  s.replace(/[\u2018\u2019\u201A\u201B]/g, "'")
   .replace(/[\u201C\u201D\u201E\u201F]/g, '"');

const HR = '═'.repeat(72);
const hr = '─'.repeat(72);

// ═════════════════════════════════════════════════════════════════════════════
//  GOOGLE SHEETS — fetch rows from one worksheet
// ═════════════════════════════════════════════════════════════════════════════

async function fetchSheetRows(tabName) {
  const url  = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data  = parseGvizJson(await resp.text());
  // gviz returns status:"error" (not an HTTP error) for invalid sheet names
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
    // Require BOTH "edition" AND ("number" or col index < 2) to avoid false matches
    if (lbl.includes('edition') && (lbl.includes('number') || i < 2)) editionCol = i;
    // Require BOTH "order" AND "number" to avoid "Shipping Paid on Order" matching
    if (lbl.includes('order') && lbl.includes('number')) orderCol = i;
  }

  const rows = [];
  for (const row of table.rows) {
    if (!row.c) continue;
    const cell = i => {
      const c = row.c[i];
      if (!c) return null;
      const v = (c.v !== null && c.v !== undefined) ? String(c.v).trim() : null;
      const f = (c.f !== null && c.f !== undefined) ? String(c.f).trim() : null;
      return f || v;  // prefer formatted display value
    };
    const rawEd    = cell(editionCol);
    const rawOrder = cell(orderCol);
    if (!rawEd || !rawOrder) continue;
    const edNum  = rawEd.replace(/[^0-9]/g, '');
    const ordNum = rawOrder.replace(/[^0-9]/g, '');
    if (!edNum || !ordNum || ordNum.length < 3) continue;  // skip header / total rows
    const edition = fmtEdition(edNum);
    if (!edition) continue;
    rows.push({ edition, orderNum: ordNum });
  }
  return rows;
}

// ═════════════════════════════════════════════════════════════════════════════
//  SHOPIFY — cached order fetch
// ═════════════════════════════════════════════════════════════════════════════

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

async function batchFetch(orderNums, delayMs = 120) {
  let done = 0;
  for (const num of orderNums) {
    if (_cache[num] !== undefined) continue;
    await fetchOrder(num);
    done++;
    if (done % 20 === 0) process.stdout.write(`  ${done} fetched...\n`);
    await new Promise(r => setTimeout(r, delayMs));
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN
// ═════════════════════════════════════════════════════════════════════════════

let totalRowsScanned = 0;
let totalLineItems   = 0;
let totalNotesParsed = 0;
const sheetErrors    = [];

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 1 — Read every worksheet
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${HR}`);
console.log('  STEP 1: Reading all worksheets');
console.log(`  (Tab name = Shopify product title — exact, no inference)`);
console.log(HR);

const sheetData = {};  // tabName → [{ edition, orderNum }]

for (const tab of SHEET_TABS) {
  try {
    const rows = await fetchSheetRows(tab);
    sheetData[tab]   = rows;
    totalRowsScanned += rows.length;
    console.log(`  ✔  "${tab}"  →  ${rows.length} row(s)`);
  } catch (e) {
    sheetData[tab] = [];
    sheetErrors.push(`"${tab}": ${e.message}`);
    console.log(`  ✘  "${tab}"  →  error: ${e.message}`);
  }
}
console.log(`\n  Worksheets: ${SHEET_TABS.length}   |   Total rows: ${totalRowsScanned}`);

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 2 — Confirm canonical mapping (no auto-detection)
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${HR}`);
console.log('  STEP 2: Canonical product mapping');
console.log(HR);
for (const tab of SHEET_TABS) {
  const n = (sheetData[tab] || []).length;
  console.log(`  "${tab}"  →  ${n} rows`);
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 3 — Collect all unique order numbers
// ─────────────────────────────────────────────────────────────────────────────
const allOrderNums    = new Set();
for (const rows of Object.values(sheetData)) rows.forEach(r => allOrderNums.add(r.orderNum));
const sortedOrderNums = [...allOrderNums].sort((a, b) => parseInt(a) - parseInt(b));

console.log(`\n${HR}`);
console.log(`  STEP 3: ${allOrderNums.size} unique order number(s) found across all worksheets`);
console.log(HR);

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 4 — Fetch every Shopify order (rate-limited, cached)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n  Fetching all Shopify orders...');
await batchFetch(sortedOrderNums, 250);

const notFoundNums = sortedOrderNums.filter(n => _cache[n] === null);
const foundNums    = sortedOrderNums.filter(n => _cache[n] !== null);

for (const num of foundNums) {
  const order = _cache[num];
  if (!order) continue;
  totalLineItems += order.line_items.length;
  if (order.note?.trim()) totalNotesParsed++;
}

console.log(`  Done — ${foundNums.length} found, ${notFoundNums.length} not found.`);
console.log(`  Total line items across all orders: ${totalLineItems}`);
console.log(`  Orders with existing notes        : ${totalNotesParsed}`);

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 5 — Build known-title set from SHEET_TABS (exact, no auto-detection)
//  A note line is "workbook-owned" iff its prefix (normalised) is in this set.
// ─────────────────────────────────────────────────────────────────────────────
const allKnownTitlesNorm = new Set(SHEET_TABS.map(normQ));

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 6 — Sheet validation: duplicate editions per worksheet
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${HR}`);
console.log('  STEP 6: Sheet validation — duplicate edition detection');
console.log(HR);

const globalDuplicates = [];

for (const [tab, rows] of Object.entries(sheetData)) {
  const edToOrder = {};
  for (const row of rows) {
    if (edToOrder[row.edition] !== undefined) {
      globalDuplicates.push({
        tab,
        edition: row.edition,
        orders:  [edToOrder[row.edition], row.orderNum],
        msg:     `DUPLICATE edition ${row.edition} in "${tab}" — orders #${edToOrder[row.edition]} and #${row.orderNum}`,
      });
    } else {
      edToOrder[row.edition] = row.orderNum;
    }
  }
  console.log(`  "${tab}": ${rows.length} rows / ${Object.keys(edToOrder).length} unique editions`);
}

if (globalDuplicates.length > 0) {
  console.log('\n  ❌ DUPLICATE EDITIONS:');
  globalDuplicates.forEach(d => console.log(`     ${d.msg}`));
} else {
  console.log('\n  ✅ No duplicate editions in any worksheet.');
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 7 — Match line items by exact product title (tab name = product title)
//
//  For EVERY order in EVERY worksheet:
//    - Inspect EVERY line item in the Shopify order (do not stop early)
//    - Match items where normQ(li.title) === normQ(tabName)
//    - shopifyQty = sum of matched item quantities
//    - countMatch  = (shopifyQty === sheet row count for this order)
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${HR}`);
console.log('  STEP 7: Inspecting all line items — matching by exact product title');
console.log(HR);

// orderSheet[orderNum][tabName] = { editions, shopifyQty, exactTitle, countMatch }
const orderSheet = {};

for (const [tab, rows] of Object.entries(sheetData)) {
  if (!rows.length) continue;

  // Group sheet rows by order number
  const byOrder = {};
  for (const row of rows) {
    if (!byOrder[row.orderNum]) byOrder[row.orderNum] = [];
    byOrder[row.orderNum].push(row.edition);
  }

  for (const [orderNum, editions] of Object.entries(byOrder)) {
    const order = _cache[orderNum];
    if (!order) continue;

    // Inspect EVERY line item — do not stop after first match
    const matchedItems = order.line_items.filter(li => normQ(li.title) === normQ(tab));
    const shopifyQty   = matchedItems.reduce((n, li) => n + li.quantity, 0);
    // Use the exact Shopify title so generated note lines preserve Shopify's own casing/unicode
    const exactTitle   = matchedItems.length ? matchedItems[0].title : tab;

    if (!orderSheet[orderNum]) orderSheet[orderNum] = {};
    orderSheet[orderNum][tab] = {
      editions:   [...editions].sort((a, b) => parseInt(a.replace('#', '')) - parseInt(b.replace('#', ''))),
      shopifyQty,
      exactTitle,
      countMatch: shopifyQty === editions.length,
    };
  }
}

// Mixed-product order detection: orders that appear in more than one worksheet
const mixedOrders = Object.entries(orderSheet)
  .filter(([, tabs]) => Object.keys(tabs).length > 1)
  .map(([num, tabs]) => ({ num, tabs: Object.keys(tabs) }));

if (mixedOrders.length > 0) {
  console.log(`  Mixed-product orders (span multiple worksheets): ${mixedOrders.length}`);
  mixedOrders.forEach(m => console.log(`    #${m.num}  →  ${m.tabs.join('  +  ')}`));
} else {
  console.log('  No mixed-product orders detected.');
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 8 — Generate expected notes, compare against Shopify, classify
// ─────────────────────────────────────────────────────────────────────────────
const results = [];

for (const orderNum of sortedOrderNums) {
  const order = _cache[orderNum];
  if (!order) { results.push({ orderNum, status: 'NOT_FOUND' }); continue; }

  const existingNote   = (order.note || '').trim();
  const sheetsForOrder = orderSheet[orderNum] || {};

  // ── Count-mismatch check ───────────────────────────────────────────────────
  const mismatches = Object.entries(sheetsForOrder)
    .filter(([, s]) => !s.countMatch)
    .map(([tab, s]) => ({
      tab,
      shopifyQty: s.shopifyQty,
      sheetRows:  s.editions.length,
      editions:   s.editions,
      wrongOrder: s.shopifyQty === 0,
    }));

  if (mismatches.length > 0) {
    results.push({ orderNum, shopifyName: order.name, status: 'MISMATCH',
                   existingNote, sheetsForOrder, mismatches });
    continue;
  }

  // ── Parse existing note ────────────────────────────────────────────────────
  const existingLines = existingNote.split('\n').map(l => l.trim()).filter(Boolean);

  // Detect duplicate lines in existing Shopify note
  const lineCount        = {};
  for (const line of existingLines) lineCount[line] = (lineCount[line] || 0) + 1;
  const duplicateNoteLines = Object.entries(lineCount)
    .filter(([, c]) => c > 1)
    .map(([l]) => l);

  // Separate workbook-owned lines from other lines (customer notes, unrelated products)
  const existingOwned = existingLines.filter(line => {
    const p = notePrefix(line);
    return p && allKnownTitlesNorm.has(normQ(p));
  });
  const otherLines = existingLines.filter(line => {
    const p = notePrefix(line);
    return !p || !allKnownTitlesNorm.has(normQ(p));
  });

  // Build the expected owned lines from all matching worksheets for this order
  const newOwnedLines = [];
  for (const [, sheetInfo] of Object.entries(sheetsForOrder)) {
    for (const ed of sheetInfo.editions) {
      newOwnedLines.push(`${sheetInfo.exactTitle}|${ed}`);
    }
  }

  // Set-equality comparison on the owned portion (normalised, order-independent)
  const ownedMatch =
    JSON.stringify([...existingOwned].map(normQ).sort()) ===
    JSON.stringify([...newOwnedLines].map(normQ).sort());

  // Wrong-product lines: existing owned lines whose prefix does NOT appear in newOwnedLines
  const expectedPrefixes = new Set(newOwnedLines.map(l => normQ(notePrefix(l) || '')));
  const wrongProductLines = existingOwned.filter(line => {
    const p = notePrefix(line);
    return p && !expectedPrefixes.has(normQ(p));
  });

  // Full new note = preserved other lines + generated owned lines
  const fullNewNote = [...otherLines, ...newOwnedLines].join('\n');

  const status = (ownedMatch && duplicateNoteLines.length === 0) ? 'SKIP' : 'UPDATE';
  results.push({
    orderNum,
    shopifyName:       order.name,
    status,
    existingNote,
    newNote:           fullNewNote,
    sheetsForOrder,
    otherLines,
    existingOwned,
    newOwnedLines,
    duplicateNoteLines,
    wrongProductLines,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 9 — Full audit report (dry run, no Shopify writes)
// ─────────────────────────────────────────────────────────────────────────────
const skipList     = results.filter(r => r.status === 'SKIP');
const updateList   = results.filter(r => r.status === 'UPDATE');
const mismatchList = results.filter(r => r.status === 'MISMATCH');
const notFoundList = results.filter(r => r.status === 'NOT_FOUND');

console.log(`\n${HR}`);
console.log('  STEP 9: FULL AUDIT REPORT  —  DRY RUN  (no Shopify writes)');
console.log(HR);

// ── Duplicate editions ────────────────────────────────────────────────────────
if (globalDuplicates.length > 0) {
  console.log('\n── 🚫 DUPLICATE EDITIONS IN SHEETS ──────────────────────────────────');
  globalDuplicates.forEach(d => console.log(`  🚫  ${d.msg}`));
}

// ── Count mismatches ──────────────────────────────────────────────────────────
if (mismatchList.length > 0) {
  console.log('\n── ❌ COUNT MISMATCHES ───────────────────────────────────────────────');
  for (const r of mismatchList) {
    console.log(`\n  ❌  ${r.shopifyName}  (#${r.orderNum})`);
    for (const m of r.mismatches) {
      console.log(`       Worksheet  : "${m.tab}"`);
      console.log(`       Sheet rows : ${m.sheetRows}   |   Shopify qty: ${m.shopifyQty}`);
      console.log(`       Editions   : ${m.editions.join(', ')}`);
      if (m.wrongOrder) {
        console.log(`       ⚠️   Product NOT found in this Shopify order — wrong order number or wrong product title?`);
      }
    }
    console.log(`       → DO NOT SYNC. Resolve mismatch first.`);
  }
}

// ── Not found ─────────────────────────────────────────────────────────────────
if (notFoundList.length > 0) {
  console.log('\n── ⛔ NOT FOUND IN SHOPIFY ──────────────────────────────────────────');
  for (const r of notFoundList) {
    console.log(`  ⛔  Order #${r.orderNum} — not in Shopify`);
  }
}

// ── Orders needing update ─────────────────────────────────────────────────────
if (updateList.length > 0) {
  console.log('\n── 🔄 ORDERS REQUIRING NOTE UPDATE ──────────────────────────────────');
  for (const r of updateList) {
    console.log(`\n  🔄  ${r.shopifyName}  (#${r.orderNum})`);

    if (r.duplicateNoteLines.length > 0) {
      console.log(`       ⚠️  Duplicate lines in current note:`);
      r.duplicateNoteLines.forEach(l => console.log(`          DUP: ${l}`));
    }
    if (r.wrongProductLines.length > 0) {
      console.log(`       ⚠️  Wrong-product lines in current note (will be removed):`);
      r.wrongProductLines.forEach(l => console.log(`          WRONG: ${l}`));
    }
    for (const [tab, s] of Object.entries(r.sheetsForOrder)) {
      console.log(`       Worksheet  : "${tab}"  →  editions: ${s.editions.join(', ')}`);
    }
    if (r.otherLines.length > 0) {
      console.log(`       Preserved  :`);
      r.otherLines.forEach(l => console.log(`          KEEP: ${l}`));
    }
    console.log(`       Current note:`);
    if (r.existingNote) {
      r.existingNote.split('\n').filter(Boolean).forEach(l => console.log(`          - ${l}`));
    } else {
      console.log(`          (empty)`);
    }
    console.log(`       New note:`);
    r.newNote.split('\n').filter(Boolean).forEach(l => console.log(`          + ${l}`));
  }
}

// ── Already correct ──────────────────────────────────────────────────────────
if (skipList.length > 0) {
  console.log(`\n── ✅ ALREADY CORRECT  (${skipList.length} orders) ───────────────────────────`);
  for (const r of skipList) {
    const lines = (r.existingNote || '').split('\n').filter(Boolean);
    console.log(`  ✅  ${r.shopifyName} — ${lines.length} line(s): ${lines.join(' | ')}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 10 — 100% coverage counters
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${HR}`);
console.log('  STEP 10: COVERAGE REPORT');
console.log(HR);
console.log(`  Total worksheets scanned     : ${SHEET_TABS.length}`);
console.log(`  Total rows scanned           : ${totalRowsScanned}`);
console.log(`  Total Shopify orders scanned : ${sortedOrderNums.length}`);
console.log(`  Total line items scanned     : ${totalLineItems}`);
console.log(`  Total notes parsed           : ${totalNotesParsed}`);
console.log(`  ✅  Already correct          : ${skipList.length}`);
console.log(`  🔄  Need update              : ${updateList.length}`);
console.log(`  ❌  Count mismatches         : ${mismatchList.length}`);
console.log(`  🚫  Duplicate editions       : ${globalDuplicates.length}`);
console.log(`  ⛔  Not found in Shopify     : ${notFoundList.length}`);
console.log(`  ⚠️   Sheet load errors        : ${sheetErrors.length}`);
if (sheetErrors.length > 0) sheetErrors.forEach(e => console.log(`       ${e}`));
console.log(HR);

// ── Final verdict ─────────────────────────────────────────────────────────────
const canSync = mismatchList.length === 0 &&
                notFoundList.length  === 0 &&
                globalDuplicates.length === 0 &&
                sheetErrors.length   === 0;

if (!canSync) {
  console.log('\n  ❌  VALIDATION FAILED — DO NOT SYNC');
  if (mismatchList.length)       console.log(`       • ${mismatchList.length} count mismatch(es)`);
  if (notFoundList.length)       console.log(`       • ${notFoundList.length} order(s) not found in Shopify`);
  if (globalDuplicates.length)   console.log(`       • ${globalDuplicates.length} duplicate edition(s) in sheets`);
  if (sheetErrors.length)        console.log(`       • ${sheetErrors.length} worksheet(s) failed to load`);
} else if (updateList.length === 0) {
  console.log('\n  ✅  VALIDATION PASSED — All notes already correct. Nothing to sync.');
} else {
  console.log(`\n  ✅  VALIDATION PASSED — No conflicts. No mismatches.`);
  console.log(`  ⏳  ${updateList.length} order note(s) queued for update.`);
  console.log(`  ⚠️   AWAITING EXPLICIT APPROVAL before any Shopify writes.`);
}
console.log(HR);

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 11 — Save sync payload
// ─────────────────────────────────────────────────────────────────────────────
if (updateList.length > 0) {
  const syncPayload = updateList.map(r => ({
    orderNum:    r.orderNum,
    shopifyId:   _cache[r.orderNum]?.id,
    shopifyName: r.shopifyName,
    newNote:     r.newNote,
  }));
  writeFileSync('sync-payload.json', JSON.stringify(syncPayload, null, 2));
  console.log(`\n  Sync payload → sync-payload.json  (${syncPayload.length} orders)`);
  console.log('  Run  node sync-notes.mjs  only after explicit approval.\n');
}
