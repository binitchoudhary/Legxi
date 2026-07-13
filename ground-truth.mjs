/**
 * ground-truth.mjs  --  PHASE 1: Canonical Ground Truth Collection
 *
 * READ ONLY. No Shopify writes. No note modifications. No file edits.
 *
 * Scans:
 *   - Every Shopify order (all pages, paginated)
 *   - Every worksheet tab (11 tabs)
 *   - Every order note (all lines, all prefixes)
 *   - Every Shopify line item
 *   - Every bundle relationship
 *   - Every certificate mapping (tab name, Shopify title, legacy format)
 *
 * Output:
 *   - ground-truth.json  (full canonical dataset)
 *   - Prints Ground Truth Summary to stdout
 */

import 'dotenv/config';
import { writeFileSync } from 'fs';

const STORE          = process.env.SHOPIFY_STORE;
const API_VERSION    = process.env.SHOPIFY_API_VERSION;
const TOKEN          = process.env.SHOPIFY_ADMIN_TOKEN;
const H              = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };
const SPREADSHEET_ID = '1D6qTb58W9_SREE5pxiHxEgqzHfRZLO9OB-x0e3yHSNA';

// ─── normQ must be defined first — all maps below depend on it ───────────────
// Uses \uXXXX escapes to prevent editor corruption of Unicode regex.
const normQ = s =>
  s.replace(/[‘’‚‛]/g, "'")
   .replace(/[“”„‟]/g, '"');

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTHORITATIVE MAPPINGS  (single source of truth — do not infer)
// ═══════════════════════════════════════════════════════════════════════════════

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

// Worksheet tab name → Shopify product title (for line item matching ONLY).
// Note lines always use the TAB NAME (left side), never the Shopify title.
const TAB_TO_SHOPIFY = {
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

// Bundle definition: parent Shopify title → child Shopify titles.
// Source: worksheet data shows 26 orders in 5 tabs (THE 18 + 4 sub-products),
// but those orders only have "THE 18 - EE SALA CUP NAMDU" as a direct line item.
// Sub-products are sold as components of the bundle, not as separate SKUs.
const BUNDLE_CHILDREN = {
  'THE 18 - EE SALA CUP NAMDU': [
    'World Champions 2026 - T20 Edition',
    "2007 : The Birth of India's T20 Era",
    '2011 WORLD CUP CHAMPIONS EDITION',
    'Arshdeep Singh : Official Hand-Signed Leather Ball',
  ],
};

// Reverse map: normQ(shopifyTitle) → tabName
const SHOPIFY_TO_TAB = {};
for (const [tab, shopify] of Object.entries(TAB_TO_SHOPIFY)) {
  SHOPIFY_TO_TAB[normQ(shopify)] = tab;
}

// All known Shopify product titles (normalized)
const ALL_KNOWN_SHOPIFY_NORM = new Set(Object.values(TAB_TO_SHOPIFY).map(normQ));
// All known tab names (normalized)
const ALL_KNOWN_TAB_NORM     = new Set(SHEET_TABS.map(normQ));
// Union — any recognized LEGXI note prefix
const ALL_KNOWN_PREFIX_NORM  = new Set([...ALL_KNOWN_SHOPIFY_NORM, ...ALL_KNOWN_TAB_NORM]);

// ═══════════════════════════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

// lastIndexOf handles product titles containing '|' (e.g. "Hand Signed Ball | AS02")
function notePrefix(line) {
  const i = line.lastIndexOf('|');
  return i !== -1 ? line.slice(0, i).trim() : null;
}

function fmtEdition(raw) {
  const n = parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
  if (isNaN(n)) return null;
  return '#' + String(n).padStart(3, '0');
}

function parseGvizJson(text) {
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  if (s === -1 || e === -1) throw new Error('No JSON in gviz response');
  return JSON.parse(text.slice(s, e + 1));
}

/**
 * Resolve a note-line prefix to its canonical tab name and format type.
 * Returns { tab, format } or null if the prefix is not a recognized LEGXI product.
 *
 * format values:
 *   TAB_NAME       — prefix matches a worksheet tab name (canonical)
 *   SHOPIFY_TITLE  — prefix matches a Shopify product title that differs from its tab name (legacy)
 */
function resolvePrefix(prefix) {
  const pNorm = normQ(prefix);
  // Tab name check first (canonical format)
  if (ALL_KNOWN_TAB_NORM.has(pNorm)) {
    return { tab: SHEET_TABS.find(t => normQ(t) === pNorm), format: 'TAB_NAME' };
  }
  // Shopify title check (may be legacy format)
  if (ALL_KNOWN_SHOPIFY_NORM.has(pNorm)) {
    const tab = SHOPIFY_TO_TAB[pNorm];
    // If Shopify title === tab name (identity mapping), it is TAB_NAME format
    if (tab && normQ(tab) === pNorm) return { tab, format: 'TAB_NAME' };
    return { tab: tab || null, format: 'SHOPIFY_TITLE' };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DATA FETCHERS
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchSheetRows(tabName) {
  const url  = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = parseGvizJson(await resp.text());
  if (data.status === 'error') {
    const msg = data.errors?.[0]?.detailed_message || data.errors?.[0]?.message || 'unknown';
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
    rows.push({ edition, orderNum: ordNum, sheetRowIndex: ri + 2 });
  }
  return rows;
}

async function fetchAllWorksheetTabs() {
  console.log('\n  STEP 1: Reading all worksheet tabs...');
  const worksheetData = {};
  let totalRows = 0;
  for (const tab of SHEET_TABS) {
    try {
      const rows = await fetchSheetRows(tab);
      worksheetData[tab] = rows;
      totalRows += rows.length;
      console.log(`  ✔  "${tab}"  →  ${rows.length} row(s)`);
    } catch (e) {
      worksheetData[tab] = [];
      console.log(`  ✘  "${tab}"  →  ERROR: ${e.message}`);
    }
  }
  console.log(`  Total worksheet rows: ${totalRows}`);
  return worksheetData;
}

async function fetchAllShopifyOrders() {
  console.log('\n  STEP 2: Fetching ALL Shopify orders (paginated)...');
  const orders = [];
  let url = `https://${STORE}/admin/api/${API_VERSION}/orders.json` +
            `?status=any&limit=250&fields=id,name,email,note,line_items,customer,financial_status,created_at`;

  let page = 0;
  while (url) {
    page++;
    let resp;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        resp = await fetch(url, { headers: H });
        if (resp.ok) break;
        throw new Error(`HTTP ${resp.status}`);
      } catch (e) {
        if (attempt === 4) throw e;
        const wait = attempt * 2000;
        process.stdout.write(`    ⚠ Page ${page} attempt ${attempt} failed — retry in ${wait}ms\n`);
        await new Promise(r => setTimeout(r, wait));
        resp = null;
      }
    }

    const data = await resp.json();
    const pageOrders = data.orders || [];
    orders.push(...pageOrders);
    process.stdout.write(`  Page ${page}: +${pageOrders.length}  (total: ${orders.length})\n`);

    const link     = resp.headers.get('Link') || '';
    const nextMatch = link.match(/<([^>]+)>;\s*rel="next"/);
    url = nextMatch ? nextMatch[1] : null;
    await new Promise(r => setTimeout(r, 250));
  }

  console.log(`  Done — ${orders.length} total orders fetched.`);
  return orders;
}

async function fetchShopifyProducts() {
  console.log('\n  STEP 3: Fetching Shopify product catalog...');
  const products = [];
  let url = `https://${STORE}/admin/api/${API_VERSION}/products.json?limit=250&fields=id,title,product_type,tags,status,handle`;

  while (url) {
    const resp = await fetch(url, { headers: H });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} on products`);
    const data = await resp.json();
    products.push(...(data.products || []));
    const link      = resp.headers.get('Link') || '';
    const nextMatch = link.match(/<([^>]+)>;\s*rel="next"/);
    url = nextMatch ? nextMatch[1] : null;
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`  Done — ${products.length} products in catalog.`);
  return products;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GROUND TRUTH BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildGroundTruth(worksheetData, allOrders, products) {
  console.log('\n  STEP 4: Building canonical ground truth...');

  // Index worksheet rows: key = `${orderNum}||${normQ(tab)}`
  const sheetIndex = new Map();
  let totalWsRows = 0;
  for (const [tab, rows] of Object.entries(worksheetData)) {
    for (const row of rows) {
      sheetIndex.set(`${row.orderNum}||${normQ(tab)}`, {
        tab, shopifyTitle: TAB_TO_SHOPIFY[tab], edition: row.edition, sheetRow: row.sheetRowIndex,
      });
      totalWsRows++;
    }
  }

  // Index all fetched orders by order number
  const orderByNum = new Map();
  for (const order of allOrders) {
    const num = (order.name || '').replace(/[^0-9]/g, '');
    if (num) orderByNum.set(num, order);
  }

  // Index Shopify products by normalized title
  const productByTitle = new Map();
  for (const p of products) {
    productByTitle.set(normQ(p.title), p);
  }

  // Collect all LEGXI-related order numbers
  const legxiNums = new Set();

  // From worksheets
  for (const rows of Object.values(worksheetData)) {
    for (const { orderNum } of rows) legxiNums.add(orderNum);
  }

  // From all orders: any order with a LEGXI line item or LEGXI note line
  for (const order of allOrders) {
    const num = (order.name || '').replace(/[^0-9]/g, '');
    if (!num) continue;

    const hasLegxiItem = (order.line_items || []).some(li => ALL_KNOWN_SHOPIFY_NORM.has(normQ(li.title)));
    const hasLegxiNote = (order.note || '').split('\n').some(line => {
      const p = notePrefix(line);
      return p && ALL_KNOWN_PREFIX_NORM.has(normQ(p));
    });

    if (hasLegxiItem || hasLegxiNote) legxiNums.add(num);
  }

  // Build records for every LEGXI order
  const records = {};

  for (const orderNum of [...legxiNums].sort((a, b) => parseInt(a) - parseInt(b))) {
    const order = orderByNum.get(orderNum);

    // All worksheet certificates for this order (across all tabs)
    const worksheetCerts = [];
    for (const [tab, rows] of Object.entries(worksheetData)) {
      for (const row of rows) {
        if (row.orderNum === orderNum) {
          worksheetCerts.push({
            tab,
            shopifyTitle: TAB_TO_SHOPIFY[tab],
            edition:      row.edition,
            sheetRow:     row.sheetRowIndex,
          });
        }
      }
    }

    // Order not found in Shopify
    if (!order) {
      records[orderNum] = {
        orderNumber: orderNum,
        orderId: null, customer: null, financialStatus: null, createdAt: null,
        lineItems: [], rawNote: null, parsedNoteLines: [],
        worksheetCertificates: worksheetCerts,
        confirmedDirect: [], confirmedBundle: [], allConfirmed: [],
        bundleParent: null, bundleChildren: [],
        expectedNoteLines: worksheetCerts.map(c => `${c.tab}|${c.edition}`),
        presentInNote: [],
        missingFromNote: worksheetCerts.map(c => `${c.tab}|${c.edition}`),
        duplicateLines: [], extraInNote: [],
        productMappingSource: 'WORKSHEET_ONLY',
        confidence: 'LOW — order not in Shopify',
      };
      continue;
    }

    // Line items
    const lineItems = (order.line_items || []).map(li => ({
      title:     li.title,
      quantity:  li.quantity,
      sku:       li.sku || null,
      variantId: li.variant_id ? String(li.variant_id) : null,
    }));

    // Customer
    const c = order.customer;
    const customer = {
      name:  c ? [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || '(unknown)' : '(unknown)',
      email: c?.email || order.email || null,
      phone: c?.phone || null,
    };

    // Tabs confirmed by direct line item
    const confirmedDirect = SHEET_TABS.filter(tab => {
      const shopify = TAB_TO_SHOPIFY[tab];
      return lineItems.some(li => normQ(li.title) === normQ(shopify));
    });

    // Tabs confirmed via bundle parent
    const confirmedBundle = [];
    let bundleParent = null;
    let bundleChildren = [];
    for (const [parentShopify, childShopifyList] of Object.entries(BUNDLE_CHILDREN)) {
      if (lineItems.some(li => normQ(li.title) === normQ(parentShopify))) {
        bundleParent = parentShopify;
        bundleChildren = childShopifyList;
        for (const childShopify of childShopifyList) {
          const tab = SHOPIFY_TO_TAB[normQ(childShopify)];
          if (tab && !confirmedDirect.includes(tab)) confirmedBundle.push(tab);
        }
        break;
      }
    }

    const allConfirmed = [...new Set([...confirmedDirect, ...confirmedBundle])];

    // Parse all note lines
    const rawNote  = order.note || '';
    const rawLines = rawNote.split('\n').map(l => l.trim()).filter(Boolean);

    const parsedNoteLines = rawLines.map(line => {
      const i = line.lastIndexOf('|');
      if (i === -1) {
        return { raw: line, prefix: null, edition: null, canonicalTab: null, format: 'NO_PIPE' };
      }
      const prefix  = line.slice(0, i).trim();
      const edition = line.slice(i + 1).trim();
      const resolved = resolvePrefix(prefix);
      return {
        raw:          line,
        prefix,
        edition,
        canonicalTab: resolved?.tab   || null,
        format:       resolved?.format || 'UNKNOWN_PRODUCT',
      };
    });

    // Expected note lines (tab-name format, one per worksheet cert)
    const expectedNoteLines = worksheetCerts.map(c => `${c.tab}|${c.edition}`);

    // Compare expected vs note
    const presentInNote   = [];
    const missingFromNote = [];
    const duplicateLines  = [];

    for (const expected of expectedNoteLines) {
      const occurrences = rawLines.filter(l => normQ(l) === normQ(expected)).length;
      if (occurrences === 0)     missingFromNote.push(expected);
      else if (occurrences === 1) presentInNote.push(expected);
      else                       duplicateLines.push({ line: expected, count: occurrences });
    }

    // Extra note lines (present in note but NOT among expected lines)
    const extraInNote = [];
    for (const parsed of parsedNoteLines) {
      const isExpected = expectedNoteLines.some(el => normQ(el) === normQ(parsed.raw));
      if (isExpected) continue;

      let category;
      if (!parsed.canonicalTab) {
        category = 'UNKNOWN_PRODUCT';
      } else {
        const inWsForProduct = sheetIndex.has(`${orderNum}||${normQ(parsed.canonicalTab)}`);
        if (inWsForProduct) {
          // In worksheet, but note uses non-canonical prefix format
          category = parsed.format === 'SHOPIFY_TITLE' ? 'LEGACY_FORMAT' : 'FORMAT_MISMATCH';
        } else {
          // Not in worksheet for this product — check if product is confirmed
          const confirmedForProduct = allConfirmed.includes(parsed.canonicalTab);
          category = confirmedForProduct ? 'UNTRACKED_CERT' : 'WRONG_PRODUCT';
        }
      }

      extraInNote.push({ ...parsed, category });
    }

    // Confidence and mapping source
    let confidence, productMappingSource;
    const hasWsRows = worksheetCerts.length > 0;

    if (confirmedDirect.length > 0 && confirmedBundle.length === 0) {
      confidence = 'HIGH';   productMappingSource = 'DIRECT';
    } else if (confirmedDirect.length > 0 && confirmedBundle.length > 0) {
      confidence = 'MEDIUM'; productMappingSource = 'MIXED (direct + bundle)';
    } else if (confirmedBundle.length > 0) {
      confidence = 'MEDIUM'; productMappingSource = 'BUNDLE';
    } else if (hasWsRows) {
      confidence = 'LOW';    productMappingSource = 'WORKSHEET_ONLY';
    } else {
      confidence = 'LOW';    productMappingSource = 'NOTE_ONLY';
    }

    records[orderNum] = {
      orderNumber: orderNum,
      orderId:          String(order.id),
      customer,
      financialStatus:  order.financial_status || null,
      createdAt:        order.created_at        || null,
      lineItems,
      bundleParent,
      bundleChildren,
      confirmedDirect,
      confirmedBundle,
      allConfirmed,
      rawNote,
      parsedNoteLines,
      worksheetCertificates: worksheetCerts,
      expectedNoteLines,
      presentInNote,
      missingFromNote,
      duplicateLines,
      extraInNote,
      productMappingSource,
      confidence,
    };
  }

  console.log(`  Done — ${Object.keys(records).length} LEGXI orders in ground truth.`);
  return { records, products, worksheetData, totalWsRows };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SUMMARY PRINTER
// ═══════════════════════════════════════════════════════════════════════════════

function printSummary(gt, allOrders) {
  const { records, products, worksheetData, totalWsRows } = gt;
  const orders = Object.values(records);
  const HR = '═'.repeat(72);
  const hr = '─'.repeat(72);
  const pad = (s, n) => String(s).padEnd(n);
  const rpad = (s, n) => String(s).padStart(n);

  console.log(`\n${HR}`);
  console.log('  LEGXI GROUND TRUTH SUMMARY  —  Phase 1');
  console.log(`  Generated : ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`);
  console.log(HR);

  // ── Scope ──────────────────────────────────────────────────────────────────
  console.log('\n  SCOPE');
  console.log(hr);
  console.log(`  Total Shopify orders scanned      : ${rpad(allOrders.length, 4)}`);
  console.log(`  LEGXI-related orders identified   : ${rpad(orders.length, 4)}`);
  console.log(`  Orders not found in Shopify       : ${rpad(orders.filter(r => !r.orderId).length, 4)}`);
  console.log(`  Total worksheet rows (all tabs)   : ${rpad(totalWsRows, 4)}`);

  // ── Shopify product catalog ─────────────────────────────────────────────────
  console.log(`\n  SHOPIFY PRODUCT CATALOG  (${products.length} products)`);
  console.log(hr);
  // Filter to LEGXI products
  const legxiProducts = products.filter(p =>
    ALL_KNOWN_SHOPIFY_NORM.has(normQ(p.title))
  );
  const otherProducts = products.filter(p =>
    !ALL_KNOWN_SHOPIFY_NORM.has(normQ(p.title))
  );
  console.log(`  LEGXI products found in catalog   : ${legxiProducts.length}`);
  legxiProducts.forEach(p => {
    const tab = SHOPIFY_TO_TAB[normQ(p.title)] || '—';
    const sameAsTab = normQ(tab) === normQ(p.title) ? '' : `  →  tab: "${tab}"`;
    console.log(`    [${p.status}]  ${p.title}${sameAsTab}`);
  });
  if (otherProducts.length) {
    console.log(`  Other products (not in worksheet) : ${otherProducts.length}`);
    otherProducts.forEach(p => console.log(`    [${p.status}]  ${p.title}`));
  }

  // ── Bundle analysis ─────────────────────────────────────────────────────────
  console.log('\n  BUNDLE ANALYSIS');
  console.log(hr);
  for (const [parentShopify, children] of Object.entries(BUNDLE_CHILDREN)) {
    const bundleOrders = orders.filter(r => r.bundleParent === parentShopify);
    console.log(`  Bundle parent : "${parentShopify}"`);
    console.log(`  Bundle orders : ${bundleOrders.length}`);
    console.log(`  Bundle children (${children.length}):`);
    children.forEach(c => {
      const tab = SHOPIFY_TO_TAB[normQ(c)];
      console.log(`    "${c}"  →  tab: "${tab}"`);
    });
    if (bundleOrders.length > 0) {
      const nums = bundleOrders.map(r => r.orderNumber).sort((a, b) => parseInt(a) - parseInt(b));
      console.log(`  Order numbers : ${nums.join(', ')}`);
    }
  }

  // ── Worksheet coverage ─────────────────────────────────────────────────────
  console.log('\n  WORKSHEET COVERAGE');
  console.log(hr);
  console.log(`  ${'Tab Name'.padEnd(50)} ${'Rows'.padStart(4)}  ${'Orders'.padStart(6)}  ${'Direct'.padStart(6)}  ${'Bundle'.padStart(6)}  ${'WsOnly'.padStart(6)}`);
  console.log('  ' + '─'.repeat(85));
  for (const tab of SHEET_TABS) {
    const rows      = worksheetData[tab] || [];
    const uniqueOrd = new Set(rows.map(r => r.orderNum));
    const direct    = [...uniqueOrd].filter(num => {
      const r = records[num];
      return r && r.confirmedDirect.includes(tab);
    }).length;
    const bundle    = [...uniqueOrd].filter(num => {
      const r = records[num];
      return r && r.confirmedBundle.includes(tab);
    }).length;
    const wsOnly    = [...uniqueOrd].filter(num => {
      const r = records[num];
      return r && !r.allConfirmed.includes(tab);
    }).length;
    const label = tab.length > 50 ? tab.slice(0, 47) + '...' : tab;
    console.log(`  ${label.padEnd(50)} ${rpad(rows.length, 4)}  ${rpad(uniqueOrd.size, 6)}  ${rpad(direct, 6)}  ${rpad(bundle, 6)}  ${rpad(wsOnly, 6)}`);
  }
  console.log('  (Direct = confirmed by Shopify line item; Bundle = inferred via bundle parent; WsOnly = worksheet row with no Shopify confirmation)');

  // ── Confidence ─────────────────────────────────────────────────────────────
  console.log('\n  CONFIDENCE BREAKDOWN');
  console.log(hr);
  const hi  = orders.filter(r => r.confidence.startsWith('HIGH')).length;
  const med = orders.filter(r => r.confidence.startsWith('MEDIUM')).length;
  const lo  = orders.filter(r => r.confidence.startsWith('LOW')).length;
  console.log(`  HIGH   (direct Shopify line item)         : ${rpad(hi, 3)}`);
  console.log(`  MEDIUM (bundle parent inference)          : ${rpad(med, 3)}`);
  console.log(`  LOW    (worksheet only / not in Shopify)  : ${rpad(lo, 3)}`);
  console.log(`  Total                                     : ${rpad(orders.length, 3)}`);

  // ── Note health ────────────────────────────────────────────────────────────
  console.log('\n  NOTE HEALTH');
  console.log(hr);
  const noteComplete   = orders.filter(r => r.missingFromNote.length === 0 && r.duplicateLines.length === 0 && r.extraInNote.filter(e => ['LEGACY_FORMAT','FORMAT_MISMATCH','WRONG_PRODUCT'].includes(e.category)).length === 0).length;
  const noteMissing    = orders.filter(r => r.missingFromNote.length > 0).length;
  const noteDuplicate  = orders.filter(r => r.duplicateLines.length > 0).length;
  const noteHasLegacy  = orders.filter(r => r.extraInNote.some(e => e.category === 'LEGACY_FORMAT')).length;
  const noteHasWrong   = orders.filter(r => r.extraInNote.some(e => e.category === 'WRONG_PRODUCT')).length;
  const noteHasUntrack = orders.filter(r => r.extraInNote.some(e => e.category === 'UNTRACKED_CERT')).length;
  const noteHasUnknown = orders.filter(r => r.extraInNote.some(e => e.category === 'UNKNOWN_PRODUCT')).length;
  console.log(`  Orders with all expected lines present    : ${rpad(noteComplete, 3)}`);
  console.log(`  Orders with missing expected lines        : ${rpad(noteMissing, 3)}`);
  console.log(`  Orders with duplicate note lines          : ${rpad(noteDuplicate, 3)}`);
  console.log(`  Orders with legacy-format lines           : ${rpad(noteHasLegacy, 3)}`);
  console.log(`  Orders with wrong-product lines           : ${rpad(noteHasWrong, 3)}`);
  console.log(`  Orders with untracked-cert lines          : ${rpad(noteHasUntrack, 3)}`);
  console.log(`  Orders with unknown-product lines         : ${rpad(noteHasUnknown, 3)}`);

  // ── Extra note line categories ─────────────────────────────────────────────
  const allExtra = orders.flatMap(r => r.extraInNote.map(e => ({ ...e, orderNum: r.orderNumber })));
  if (allExtra.length > 0) {
    console.log('\n  EXTRA NOTE LINES  (lines in notes beyond expected worksheet lines)');
    console.log(hr);
    const categories = ['LEGACY_FORMAT', 'WRONG_PRODUCT', 'UNTRACKED_CERT', 'FORMAT_MISMATCH', 'UNKNOWN_PRODUCT'];
    for (const cat of categories) {
      const items = allExtra.filter(e => e.category === cat);
      if (items.length === 0) continue;
      const orderCount = new Set(items.map(e => e.orderNum)).size;
      console.log(`\n  ${cat}  (${items.length} line(s) across ${orderCount} order(s))`);
      items.forEach(e => {
        console.log(`    #${e.orderNum}  "${e.raw}"`);
        if (e.canonicalTab && e.canonicalTab !== e.prefix) {
          console.log(`         ↳ maps to tab: "${e.canonicalTab}"`);
        }
      });
    }
    const otherExtra = allExtra.filter(e => !categories.includes(e.category));
    if (otherExtra.length > 0) {
      console.log(`\n  OTHER (${otherExtra.length}):`);
      otherExtra.forEach(e => console.log(`    #${e.orderNum}  ${e.category}  "${e.raw}"`));
    }
  } else {
    console.log('\n  EXTRA NOTE LINES: none found.');
  }

  // ── Missing note lines per product ─────────────────────────────────────────
  console.log('\n  MISSING NOTE LINES BY PRODUCT');
  console.log(hr);
  for (const tab of SHEET_TABS) {
    const missingForTab = orders.flatMap(r =>
      r.missingFromNote.filter(ml => ml.startsWith(tab + '|')).map(ml => ({ orderNum: r.orderNumber, line: ml, source: r.productMappingSource, confidence: r.confidence }))
    );
    if (missingForTab.length === 0) continue;
    console.log(`\n  "${tab}"  —  ${missingForTab.length} missing:`);
    missingForTab.forEach(m => console.log(`    #${m.orderNum}  ${m.line}  [${m.confidence}]`));
  }

  // ── Discrepancy flags ──────────────────────────────────────────────────────
  console.log('\n  DISCREPANCY FLAGS');
  console.log(hr);

  // Orders in Shopify with LEGXI products but NOT in any worksheet
  const notInWs = orders.filter(r =>
    r.confirmedDirect.length > 0 &&
    r.worksheetCertificates.length === 0
  );
  if (notInWs.length > 0) {
    console.log(`\n  Orders with LEGXI line items NOT in any worksheet (${notInWs.length}):`);
    notInWs.forEach(r => {
      const titles = r.confirmedDirect.join(', ');
      console.log(`    #${r.orderNumber}  ${r.customer.name}  —  has: ${titles}`);
    });
  } else {
    console.log('  Orders with LEGXI items not in any worksheet    : 0');
  }

  // Orders in worksheet but order not found in Shopify
  const notInShopify = orders.filter(r => !r.orderId && r.worksheetCertificates.length > 0);
  if (notInShopify.length > 0) {
    console.log(`\n  Worksheet orders NOT found in Shopify (${notInShopify.length}):`);
    notInShopify.forEach(r => console.log(`    #${r.orderNumber}  —  in tabs: ${r.worksheetCertificates.map(c => c.tab).join(', ')}`));
  } else {
    console.log('  Worksheet orders not found in Shopify           : 0');
  }

  // Orders with LEGXI notes but no worksheet row and no direct line item
  const noteOnlyOrders = orders.filter(r =>
    r.productMappingSource === 'NOTE_ONLY' && r.extraInNote.length > 0
  );
  if (noteOnlyOrders.length > 0) {
    console.log(`\n  Orders with LEGXI notes but no worksheet row and no line item (${noteOnlyOrders.length}):`);
    noteOnlyOrders.forEach(r => {
      r.extraInNote.forEach(e => console.log(`    #${r.orderNumber}  "${e.raw}"`));
    });
  }

  // Order #1498 typo flag
  const r1498 = records['1498'];
  if (r1498) {
    const wrongTitle = r1498.lineItems.find(li => normQ(li.title).includes('namde'));
    if (wrongTitle) {
      console.log(`\n  ⚠  TYPO DETECTED: Order #1498 has line item "${wrongTitle.title}"`);
      console.log(`     Expected: "THE 18 - EE SALA CUP NAMDU"  (NAMDU, not NAMDE)`);
    }
  }

  // ── Totals ─────────────────────────────────────────────────────────────────
  console.log(`\n${HR}`);
  console.log('  TOTALS');
  console.log(HR);
  const totalExpected = orders.reduce((n, r) => n + r.expectedNoteLines.length, 0);
  const totalPresent  = orders.reduce((n, r) => n + r.presentInNote.length, 0);
  const totalMissing  = orders.reduce((n, r) => n + r.missingFromNote.length, 0);
  const totalDup      = orders.reduce((n, r) => n + r.duplicateLines.length, 0);
  const totalExtra    = orders.reduce((n, r) => n + r.extraInNote.length, 0);
  console.log(`  Expected note lines (all orders)  : ${rpad(totalExpected, 4)}`);
  console.log(`  Already correct (present 1x)      : ${rpad(totalPresent, 4)}`);
  console.log(`  Missing                           : ${rpad(totalMissing, 4)}`);
  console.log(`  Duplicates                        : ${rpad(totalDup, 4)}`);
  console.log(`  Extra (legacy/wrong/untracked)    : ${rpad(totalExtra, 4)}`);
  console.log(HR);
  console.log('\n  Ground truth written to  ground-truth.json');
  console.log('  PHASE 1 COMPLETE. No Shopify data was modified.\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const worksheetData = await fetchAllWorksheetTabs();
const allOrders     = await fetchAllShopifyOrders();
const products      = await fetchShopifyProducts();

const groundTruth   = buildGroundTruth(worksheetData, allOrders, products);

// Write full canonical dataset
writeFileSync('ground-truth.json', JSON.stringify(groundTruth, null, 2), 'utf8');

printSummary(groundTruth, allOrders);
