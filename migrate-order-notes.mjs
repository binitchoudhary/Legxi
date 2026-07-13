import { readFileSync } from 'fs';
import https from 'https';

const env = readFileSync('.env', 'utf8');
const getEnv = (k) => env.match(new RegExp(`^${k}=(.+)`, 'm'))?.[1]?.trim() ?? '';

const STORE   = getEnv('SHOPIFY_STORE');
const TOKEN   = getEnv('SHOPIFY_ADMIN_TOKEN');
const VERSION = getEnv('SHOPIFY_API_VERSION');
const SHEET_ID = '1D6qTb58W9_SREE5pxiHxEgqzHfRZLO9OB-x0e3yHSNA';

// Each sheet name maps to a matcher against Shopify line item titles
const SHEETS = [
  // RCB ARTWORK = "THE 18 - EE SALA CUP NAMDU/NAMDE" — RCB IPL win artwork
  { name: 'RCB ARTWORK',          match: t => /rcb|royal.challengers|bangalore|ee.sala|namdu|namde|the.18/i.test(t) },
  { name: '2026 WC Artwork',      match: t => /2026/i.test(t) },
  { name: 'RB256 Signed Ball',    match: t => /bishnoi|ravi/i.test(t) },
  { name: '2007 WC ARTWORK',      match: t => /2007/i.test(t) },
  { name: '2011 WC Artwork',      match: t => /2011/i.test(t) },
  { name: '1983 Artwork',         match: t => /1983/i.test(t) },
  { name: 'GOD OF CRICKET',       match: t => /god.of.cricket|100.centur/i.test(t) },
  // AS 02 BALL: older orders used "Hand Signed Ball | AS02" (no "arshdeep" in title)
  { name: 'AS 02 BALL',           match: t => /ball/i.test(t) && (/arshdeep/i.test(t) || /as.?02/i.test(t)) },
  { name: 'AS 02 Signed ARTWORK', match: t => /arshdeep/i.test(t) && /(gold|plat|artwork)/i.test(t) },
  { name: 'SI96 Signed ARTWORK',  match: t => /shreyas|iyer/i.test(t) },
  { name: 'AS02 CAP',             match: t => /cap/i.test(t) && (/arshdeep/i.test(t) || /as.?02/i.test(t)) },
];

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const rows = [];
  let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === ',' && !inQ) { row.push(cur.trim()); cur = ''; continue; }
    if ((c === '\n' || c === '\r') && !inQ) {
      row.push(cur.trim()); cur = '';
      if (row.some(x => x)) rows.push(row);
      row = [];
      if (c === '\r' && text[i + 1] === '\n') i++;
      continue;
    }
    cur += c;
  }
  if (cur || row.length) { row.push(cur.trim()); if (row.some(x => x)) rows.push(row); }
  return rows;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function get(url) {
  return new Promise((res, rej) => {
    https.get(url, r => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location)
        return get(r.headers.location).then(res).catch(rej);
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(d));
    }).on('error', rej);
  });
}

function gql(query) {
  return new Promise((res, rej) => {
    const body = JSON.stringify({ query });
    const req = https.request({
      hostname: STORE, method: 'POST',
      path: `/admin/api/${VERSION}/graphql.json`,
      headers: {
        'X-Shopify-Access-Token': TOKEN,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    });
    req.on('error', rej);
    req.write(body);
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Sheet fetcher ─────────────────────────────────────────────────────────────
async function fetchSheet(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const text = await get(url);
  const rows = parseCSV(text);
  if (rows.length < 2) return [];

  const hdr = rows[0].map(h => h.toLowerCase());
  const eIdx = hdr.findIndex(h => h.includes('edition'));
  const oIdx = hdr.findIndex(h => h.includes('order'));
  if (eIdx < 0 || oIdx < 0) return [];

  return rows.slice(1).flatMap(row => {
    const edition = row[eIdx]?.replace(/\D/g, '');
    const order   = row[oIdx]?.replace(/\D/g, '');
    if (!edition || !order || order.length < 3) return [];
    return [{ order, edition: '#' + edition.padStart(3, '0') }];
  });
}

// ── Shopify helpers ───────────────────────────────────────────────────────────
async function getOrder(num) {
  const r = await gql(`{
    orders(first: 1, query: "name:#${num}") {
      edges { node {
        id name note
        lineItems(first: 20) { edges { node { title } } }
      }}
    }
  }`);
  const n = r.data?.orders?.edges?.[0]?.node;
  if (!n) return null;
  return {
    id:    n.id,
    name:  n.name,
    note:  n.note || '',
    items: n.lineItems.edges.map(e => e.node.title),
  };
}

async function updateNote(id, note) {
  const escaped = note
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
  const r = await gql(`mutation {
    orderUpdate(input: { id: "${id}", note: "${escaped}" }) {
      order { name note }
      userErrors { field message }
    }
  }`);
  return r.data?.orderUpdate;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== LEGXI ORDER NOTE MIGRATION ===\n');

  // Step 1: Fetch all sheets → orderMap: orderNum -> [{sheetName, edition}]
  const orderMap = new Map();

  for (const sheet of SHEETS) {
    process.stdout.write(`Fetching "${sheet.name}"... `);
    const entries = await fetchSheet(sheet.name);
    console.log(`${entries.length} entries`);
    for (const { order, edition } of entries) {
      if (!orderMap.has(order)) orderMap.set(order, []);
      orderMap.get(order).push({ sheetName: sheet.name, edition });
    }
    await sleep(400);
  }

  const orders = [...orderMap.keys()];
  console.log(`\nTotal unique orders: ${orders.length}\n`);
  console.log('─'.repeat(60));

  let ok = 0, skip = 0, err = 0;
  const unmatched = [];

  // Step 2: Process each order
  for (const num of orders) {
    const sheetEntries = orderMap.get(num);
    const order = await getOrder(num);

    if (!order) {
      console.log(`✗  #${num.padEnd(6)} — Not found in Shopify`);
      err++; await sleep(300); continue;
    }

    // Skip already-migrated orders (note already contains edition format)
    if (order.note && order.note.includes('|#')) {
      console.log(`↷  ${order.name.padEnd(7)} — Already migrated, skipping`);
      skip++; await sleep(200); continue;
    }

    // Match each sheet entry to a Shopify line item
    const noteLines = [];
    const missed    = [];

    for (const { sheetName, edition } of sheetEntries) {
      const sheetDef = SHEETS.find(s => s.name === sheetName);
      const matched  = order.items.find(t => sheetDef.match(t));

      if (matched) {
        noteLines.push(`${matched}|${edition}`);
      } else if (order.items.length === 1) {
        // Single-item order — any sheet entry must be for this product
        noteLines.push(`${order.items[0]}|${edition}`);
      } else {
        missed.push({ sheetName, edition });
      }
    }

    if (missed.length > 0) {
      console.log(`⚠  ${order.name.padEnd(7)} — ${missed.length} unmatched`);
      missed.forEach(m =>
        console.log(`     Sheet: "${m.sheetName}" ${m.edition} | Items: [${order.items.join(' / ')}]`)
      );
      unmatched.push({ num, order, missed });
      skip++; await sleep(300); continue;
    }

    const newNote   = noteLines.join('\n');
    const finalNote = order.note ? order.note + '\n' + newNote : newNote;

    const result = await updateNote(order.id, finalNote);

    if (result?.userErrors?.length > 0) {
      console.log(`✗  ${order.name.padEnd(7)} — ${result.userErrors[0].message}`);
      err++;
    } else {
      console.log(`✓  ${order.name.padEnd(7)} — ${noteLines.join(' | ')}`);
      ok++;
    }

    await sleep(500); // respect Shopify rate limits
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`✓  Written:        ${ok}`);
  console.log(`↷  Skipped:        ${skip}`);
  console.log(`✗  Errors:         ${err}`);

  if (unmatched.length > 0) {
    console.log('\n⚠  UNMATCHED — NEEDS MANUAL REVIEW:');
    unmatched.forEach(({ num, order, missed }) => {
      console.log(`  Order #${num} | Line items: [${order.items.join(' / ')}]`);
      missed.forEach(m => console.log(`    → Sheet: "${m.sheetName}" ${m.edition}`));
    });
  }
}

main().catch(console.error);
