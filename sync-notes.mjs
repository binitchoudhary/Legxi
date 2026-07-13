/**
 * sync-notes.mjs
 * Writes Shopify order notes that were previewed and approved in workbook-audit.mjs.
 *
 * ONLY run this after reviewing and approving the workbook-audit.mjs report.
 * Reads sync-payload.json written by the audit script.
 *
 * Usage: node sync-notes.mjs
 */

import 'dotenv/config';
import { readFileSync } from 'fs';

const STORE       = process.env.SHOPIFY_STORE;
const API_VERSION = process.env.SHOPIFY_API_VERSION;
const TOKEN       = process.env.SHOPIFY_ADMIN_TOKEN;
const H           = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

let payload;
try {
  payload = JSON.parse(readFileSync('sync-payload.json', 'utf8'));
} catch {
  console.error('sync-payload.json not found. Run workbook-audit.mjs first.');
  process.exit(1);
}

console.log(`\n  Loaded ${payload.length} orders from sync-payload.json`);
console.log('  Writing to Shopify...\n');

let ok = 0, fail = 0;

for (const { orderNum, shopifyId, shopifyName, newNote } of payload) {
  if (!shopifyId) {
    console.log(`  ⚠ ${shopifyName || orderNum} — missing Shopify ID, skipping`);
    fail++;
    continue;
  }

  const url  = `https://${STORE}/admin/api/${API_VERSION}/orders/${shopifyId}.json`;
  const body = JSON.stringify({ order: { id: shopifyId, note: newNote } });

  const r = await fetch(url, { method: 'PUT', headers: H, body });
  const d = await r.json();

  if (d.order && d.order.id) {
    ok++;
    console.log(`  ✅ ${shopifyName}`);
    newNote.split('\n').filter(Boolean).forEach(l => console.log(`     ${l}`));
  } else {
    fail++;
    console.log(`  ❌ ${shopifyName} — ${JSON.stringify(d)}`);
  }

  await new Promise(r => setTimeout(r, 250));
}

console.log(`\n  Done. ✅ ${ok} synced  ❌ ${fail} failed`);

// ─── legacy code below — kept for reference, not used ──────────────────────

// ─── Config ────────────────────────────────────────────────────────────────
const STORE   = '5ci887-xv.myshopify.com';
const TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN || '';
const API_VER = '2025-10';

const GID0_PATH = 'C:\\Users\\dell\\AppData\\Local\\Temp\\claude\\c--Users-dell-Desktop-legxi\\6bc3be1c-5f7f-45ef-8454-096c720e8a4f\\scratchpad\\GID_0_Main_Sheet.csv';
const GID2_PATH = 'C:\\Users\\dell\\AppData\\Local\\Temp\\claude\\c--Users-dell-Desktop-legxi\\6bc3be1c-5f7f-45ef-8454-096c720e8a4f\\scratchpad\\GID_430970049_Secondary_Sheet.csv';

const DRY_RUN = process.argv.includes('--dry-run');

// Known product keyword for GID 430970049 — used to identify the right line item
// when an order has multiple edition products.
const GID2_KEYWORD = 'EE SALA CUP';

// Line items that are COA cards / price supplements — NOT the main edition product.
const COA_TITLE_RE = /^Premium Edition\s+#\d+\/\d+/i;

// ─── Shopify REST helpers ──────────────────────────────────────────────────
function shopifyRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request(
      `https://${STORE}/admin/api/${API_VER}${path}`,
      {
        method,
        headers: {
          'X-Shopify-Access-Token': TOKEN,
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (d) => (data += d));
        res.on('end', () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(data));
            else reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 400)}`));
          } catch (e) { reject(e); }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const shopifyGet = (path)       => shopifyRequest('GET',  path);
const shopifyPut = (path, body) => shopifyRequest('PUT',  path, body);

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ─── CSV helpers ───────────────────────────────────────────────────────────
function parseCSVLine(line) {
  const cols = [];
  let cur = '', inQ = false;
  for (const c of line) {
    if (c === '"' && !inQ)  { inQ = true;  continue; }
    if (c === '"' &&  inQ)  { inQ = false; continue; }
    if (c === ',' && !inQ)  { cols.push(cur); cur = ''; continue; }
    cur += c;
  }
  cols.push(cur);
  return cols;
}

function normalizeEdition(raw) {
  const m = String(raw || '').match(/(\d+)/);
  if (!m) return null;
  return '#' + String(parseInt(m[1], 10)).padStart(3, '0');
}

/**
 * Parse CSV → array of { edition: '#001', orderName: '1192', sheetGid }
 * Only rows where:
 *   col[0] matches /^#\d+$/   (edition number row)
 *   col[4] is all digits       (valid Shopify order number)
 *   col[9] === '1'             (inventory sold)
 */
function parseSheet(csvPath, sheetGid) {
  const content = fs.readFileSync(csvPath, 'utf8');
  const rows    = [];
  for (const line of content.split('\n').slice(1)) {
    const t = line.trim();
    if (!t) continue;
    const cols = parseCSVLine(t);
    const edRaw  = (cols[0] || '').trim();l
    const ordRaw = (cols[4] || '').trim();
    const inv    = (cols[9] || '').trim();

    if (!/^#\d+$/.test(edRaw))  continue;
    if (!/^\d+$/.test(ordRaw))  continue;
    if (inv !== '1')             continue;

    const edition = normalizeEdition(edRaw);
    if (!edition) continue;
    rows.push({ edition, orderName: ordRaw, sheetGid });
  }
  return rows;
}

// ─── Fetch order by Shopify order name ────────────────────────────────────
async function fetchOrderByName(name) {
  await sleep(250);
  try {
    const data = await shopifyGet(
      `/orders.json?name=${encodeURIComponent('#' + name)}&status=any&fields=id,name,note,line_items`
    );
    return (data.orders || [])[0] || null;
  } catch (e) {
    return null;
  }
}

// ─── Line item classification ──────────────────────────────────────────────

// Returns true if this line item is an "edition product" that could need a note.
function isEditionProduct(li) {
  const title  = li.title || '';
  const vtitle = (li.variant_title || '').trim();

  // COA supplement cards are not edition products
  if (COA_TITLE_RE.test(title)) return false;

  // Explicit SYSTEM ASSIGNED or edition variant
  if (/SYSTEM\s+ASSIGNED/i.test(vtitle))       return true;
  if (/EDITION\s*#?\s*\d/i.test(vtitle))       return true;
  if (/^\d+\s*\/\s*\d+/.test(vtitle))          return true;
  if (/CHOOSE YOUR EDITION/i.test(vtitle))      return true;

  // Variant is empty AND title looks like a signed collectible
  if (!vtitle && /signed|artwork|edition|ball|cap|framed/i.test(title)) return true;

  return false;
}

// ─── Find the target line item for a given GID ────────────────────────────
function findTargetLineItem(lineItems, sheetGid) {
  const edItems = lineItems.filter(isEditionProduct);
  if (edItems.length === 0) return null;
  if (edItems.length === 1) return edItems[0];

  if (sheetGid === 430970049) {
    // Pick the line item whose title contains the GID2 keyword
    const match = edItems.find((li) =>
      li.title.toUpperCase().includes(GID2_KEYWORD)
    );
    return match || null;
  } else {
    // GID 0: pick the edition item that is NOT the GID2 product
    const nonGid2 = edItems.filter(
      (li) => !li.title.toUpperCase().includes(GID2_KEYWORD)
    );
    if (nonGid2.length === 1) return nonGid2[0];
    // Multiple non-GID2 items — return null (ambiguous)
    return null;
  }
}

// ─── Note line operations ──────────────────────────────────────────────────

// Parse existing note → array of lines (trimmed, no empty)
function parseNoteLines(note) {
  return (note || '').split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
}

// Given existing note lines and a target product title, return the note lines
// with that product's line either replaced or appended, and ALL other lines preserved.
function upsertNoteLine(existingLines, productTitle, edition) {
  const newLine = `${productTitle}|${edition}`;

  // Find the existing line for this product (match on productTitle prefix before |)
  const titleUpper = productTitle.toUpperCase();
  let replaced = false;
  const result = existingLines.map((l) => {
    if (!l.includes('|')) return l; // non-edition line — keep
    const pipeIdx = l.lastIndexOf('|');
    const lineTitleFull = l.substring(0, pipeIdx).trim();
    if (lineTitleFull.toUpperCase() === titleUpper) {
      replaced = true;
      return newLine;
    }
    return l;
  });

  if (!replaced) result.push(newLine);
  return result;
}

// Normalised comparison (sort + lower) to avoid false positives from ordering
function noteNorm(lines) {
  return [...lines].sort().join('\n').toLowerCase().trim();
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== LEGXI Order Note Sync ===');
  console.log('Mode:', DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE');
  console.log('');

  // ── 1. Parse both sheets ───────────────────────────────────────────────
  const sheet0Rows = parseSheet(GID0_PATH,  0);
  const sheet2Rows = parseSheet(GID2_PATH,  430970049);
  const allRows    = [...sheet0Rows, ...sheet2Rows];

  console.log(`GID 0           : ${sheet0Rows.length} edition rows`);
  console.log(`GID 430970049   : ${sheet2Rows.length} edition rows`);
  console.log(`Total rows      : ${allRows.length}`);
  console.log('');

  // Build map: orderName → [{edition, sheetGid}]  (one order may appear in both sheets)
  const orderMap = new Map();
  for (const row of allRows) {
    if (!orderMap.has(row.orderName)) orderMap.set(row.orderName, []);
    orderMap.get(row.orderName).push({ edition: row.edition, sheetGid: row.sheetGid });
  }

  // Detect same-order + same-gid duplicates (multiple editions per product)
  const multiEditionPerGid = new Map(); // orderName → true if ambiguous
  for (const [name, entries] of orderMap) {
    const gidCount = {};
    for (const e of entries) {
      gidCount[e.sheetGid] = (gidCount[e.sheetGid] || 0) + 1;
    }
    if (Object.values(gidCount).some((c) => c > 1)) {
      multiEditionPerGid.set(name, gidCount);
    }
  }

  // ── 2. Process each unique order ───────────────────────────────────────
  const report = {
    totalRows:        allRows.length,
    ordersMatched:    0,
    alreadyCorrect:   0,
    updated:          0,
    skipped:          0,
    missingOrders:    [],
    missingProducts:  [],
    conflicts:        [],
    updatedOrders:    [],
    skippedOrders:    [],
  };

  const allOrderNames = [...orderMap.keys()].sort((a, b) => parseInt(a) - parseInt(b));
  console.log(`Unique orders to process: ${allOrderNames.length}`);
  console.log('');

  for (const orderName of allOrderNames) {
    const entries = orderMap.get(orderName);

    // ── Fetch order ──────────────────────────────────────────────────────
    const order = await fetchOrderByName(orderName);
    if (!order) {
      console.log(`  [MISSING] #${orderName} — not found in Shopify`);
      report.missingOrders.push(orderName);
      report.skipped++;
      continue;
    }
    report.ordersMatched++;

    let existingLines = parseNoteLines(order.note);
    let targetLines   = [...existingLines]; // will be mutated per entry
    let needsUpdate   = false;
    let skippedEntry  = false;

    for (const { edition, sheetGid } of entries) {

      // Flag multi-edition-per-gid ambiguity
      if (multiEditionPerGid.has(orderName)) {
        const gidCount = multiEditionPerGid.get(orderName);
        if ((gidCount[sheetGid] || 0) > 1) {
          console.log(`  [CONFLICT] #${orderName} — multiple editions in sheet GID ${sheetGid}: ${
            entries.filter((e) => e.sheetGid === sheetGid).map((e) => e.edition).join(', ')
          }. Skipping this order.`);
          report.conflicts.push(`#${orderName} GID${sheetGid}: ${
            entries.filter((e) => e.sheetGid === sheetGid).map((e) => e.edition).join(',')
          }`);
          skippedEntry = true;
          break;
        }
      }

      // ── Pre-check: does the existing note already contain this edition? ──
      // If any existing note line already ends with |#NNN matching the
      // spreadsheet edition, the entry is already correct — skip product lookup.
      const edAlreadyInNote = existingLines.some((l) => {
        if (!l.includes('|')) return false;
        const noteEdPart = l.substring(l.lastIndexOf('|') + 1).trim();
        return normalizeEdition(noteEdPart) === edition;
      });
      if (edAlreadyInNote) continue;

      // ── Find target line item ──────────────────────────────────────────
      const li = findTargetLineItem(order.line_items || [], sheetGid);
      if (!li) {
        console.log(`  [NO_PRODUCT] #${orderName} GID${sheetGid} — no edition product found in order`);
        report.missingProducts.push({ orderName, sheetGid });
        skippedEntry = true;
        continue;
      }

      const productTitle = li.title;

      // ── Check if existing note already has this exact product+edition line
      const expectedLine = `${productTitle}|${edition}`;
      if (targetLines.includes(expectedLine)) continue;

      // Need to update: upsert this product's note line
      targetLines = upsertNoteLine(targetLines, productTitle, edition);
      needsUpdate  = true;
    }

    if (skippedEntry) {
      report.skipped++;
      report.skippedOrders.push({ orderName, reason: 'conflict or missing product' });
      continue;
    }

    if (!needsUpdate || noteNorm(targetLines) === noteNorm(existingLines)) {
      console.log(`  [OK]     #${orderName}`);
      report.alreadyCorrect++;
      continue;
    }

    // ── Update order note ─────────────────────────────────────────────────
    const generatedNote = targetLines.join('\n');
    console.log(`  [UPDATE] #${orderName}`);
    console.log(`           WAS: ${JSON.stringify(order.note || '')}`);
    console.log(`           NOW: ${JSON.stringify(generatedNote)}`);

    if (!DRY_RUN) {
      try {
        await shopifyPut(`/orders/${order.id}.json`, { order: { note: generatedNote } });
        await sleep(500);
        report.updated++;
        report.updatedOrders.push({ orderName, from: order.note || '', to: generatedNote });
      } catch (e) {
        console.error(`  [ERROR]  #${orderName} — ${e.message}`);
        report.skipped++;
        report.skippedOrders.push({ orderName, reason: e.message });
      }
    } else {
      report.updated++;
      report.updatedOrders.push({ orderName, from: order.note || '', to: generatedNote });
    }
  }

  // ── 3. Final report ────────────────────────────────────────────────────
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' SYNC REPORT');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Total spreadsheet rows scanned   : ${report.totalRows}`);
  console.log(`Unique Shopify orders matched     : ${report.ordersMatched}`);
  console.log(`Orders already correct            : ${report.alreadyCorrect}`);
  console.log(`Orders ${DRY_RUN ? 'to update (dry-run)' : 'updated'}               : ${report.updated}`);
  console.log(`Orders skipped                    : ${report.skipped}`);
  console.log('');

  if (report.missingOrders.length) {
    console.log(`Orders not found in Shopify (${report.missingOrders.length}):`);
    report.missingOrders.forEach((o) => console.log(`  #${o}`));
    console.log('');
  }

  if (report.missingProducts.length) {
    console.log(`Orders with no matching edition product (${report.missingProducts.length}):`);
    report.missingProducts.forEach(({ orderName, sheetGid }) =>
      console.log(`  #${orderName} (GID ${sheetGid})`)
    );
    console.log('');
  }

  if (report.conflicts.length) {
    console.log(`Mapping conflicts — multiple editions per product in same order (${report.conflicts.length}):`);
    report.conflicts.forEach((c) => console.log(`  ${c}`));
    console.log('');
  }

  if (report.skippedOrders.length) {
    console.log(`Skipped order details (${report.skippedOrders.length}):`);
    report.skippedOrders.forEach(({ orderName, reason }) =>
      console.log(`  #${orderName} — ${reason}`)
    );
    console.log('');
  }

  if (report.updatedOrders.length) {
    console.log(`${DRY_RUN ? 'Would update' : 'Updated'} orders (${report.updatedOrders.length}):`);
    report.updatedOrders.forEach(({ orderName, from, to }) => {
      console.log(`  #${orderName}`);
      console.log(`    WAS: ${JSON.stringify(from)}`);
      console.log(`    NOW: ${JSON.stringify(to)}`);
    });
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(DRY_RUN ? 'DRY RUN complete — no changes written to Shopify.' : 'Sync complete.');
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
