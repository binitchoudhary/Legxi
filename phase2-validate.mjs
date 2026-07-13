/**
 * phase2-validate.mjs  --  PHASE 2: Row-Level Validation
 *
 * READ ONLY. No network calls. No Shopify writes. No file modifications.
 * Uses ground-truth.json as the sole source of truth.
 *
 * Output classifications per worksheet row:
 *   VALID         — purchase confirmed, note correct or missing (direct purchase)
 *   BUNDLE        — purchase confirmed via bundle parent only; component note line not yet written
 *   LEGACY        — purchase confirmed; note uses Shopify-title format instead of tab-name format
 *   TYPO          — Shopify line item has a known typo; canonical match fails
 *   INVALID       — cannot confirm this row as a valid purchase
 *   MANUAL REVIEW — ambiguous data; requires human decision before any sync
 */

import { readFileSync, writeFileSync } from 'fs';

// ─── Load ground truth ───────────────────────────────────────────────────────
const gt = JSON.parse(readFileSync('ground-truth.json', 'utf8'));
const { records, worksheetData } = gt;

const normQ = s =>
  s.replace(/[''‚‛]/g, "'")
   .replace(/[""„‟]/g, '"');

// ─── Authoritative mapping (same as Phase 1) ────────────────────────────────
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

// ─── Bundle component tabs (sub-products of THE 18 bundle) ──────────────────
// A row in one of these tabs is BUNDLE-classified when confirmed only via bundle parent.
const BUNDLE_COMPONENT_TABS = new Set([
  'World T20 Champions Edition - 2026',
  "2007 : The Birth of India's T20 Era",
  'THE 2011 WORLD CUP CHAMPIONSHIPS EDITION',
  'Hand Signed Ball | AS02',
]);
// Normalised tab names for safe matching
const BUNDLE_COMPONENT_TABS_NORM = new Set([
  normQ('World T20 Champions Edition - 2026'),
  normQ("2007 : The Birth of India's T20 Era"),
  normQ('THE 2011 WORLD CUP CHAMPIONS EDITION'),
  normQ('Hand Signed Ball | AS02'),
]);

// ─── Known typo variants ─────────────────────────────────────────────────────
// Maps normQ(typo line-item title) → normQ(correct product title)
const KNOWN_TYPO_NORM = new Map([
  [normQ('THE 18 - EE SALA CUP NAMDE'), normQ('THE 18 - EE SALA CUP NAMDU')],
]);

// ─── Non-standard edition detection ─────────────────────────────────────────
// Edition numbers above this threshold are likely years, not serial numbers.
const NON_STANDARD_THRESHOLD = 500;
const isNonStandardEdition = ed => {
  const n = parseInt(String(ed).replace(/[^0-9]/g, ''), 10);
  return !isNaN(n) && n > NON_STANDARD_THRESHOLD;
};

// ─── Validate every worksheet row ────────────────────────────────────────────
const results = [];
const totals  = { VALID: 0, BUNDLE: 0, LEGACY: 0, TYPO: 0, INVALID: 0, 'MANUAL REVIEW': 0 };

function addResult(tab, edition, orderNum, sheetRowIndex, status, reason, customer, rawNote) {
  results.push({ tab, edition, orderNum, sheetRowIndex, status, reason, customer, rawNote });
  totals[status] = (totals[status] || 0) + 1;
}

for (const [tab, rows] of Object.entries(worksheetData)) {
  const shopifyTitle = TAB_TO_SHOPIFY[tab] || tab;

  for (const { edition, orderNum, sheetRowIndex } of rows) {
    const rec = records[orderNum];

    // ── 1. Order not in Shopify ───────────────────────────────────────────
    if (!rec || rec.orderId === null) {
      addResult(tab, edition, orderNum, sheetRowIndex,
        'MANUAL REVIEW', 'Order number not found in Shopify', null, null);
      continue;
    }

    const lineItems       = rec.lineItems     || [];
    const customer        = rec.customer?.name || '(unknown)';
    const confirmedDirect = rec.confirmedDirect || [];
    const confirmedBundle = rec.confirmedBundle || [];
    const presentInNote   = rec.presentInNote   || [];
    const missingFromNote = rec.missingFromNote  || [];
    const duplicateLines  = rec.duplicateLines   || [];
    const extraInNote     = rec.extraInNote      || [];
    const parsedLines     = rec.parsedNoteLines  || [];
    const expectedLine    = `${tab}|${edition}`;

    // ── 2. TYPO: any line item is a known typo variant ───────────────────
    const typoItem = lineItems.find(li => KNOWN_TYPO_NORM.has(normQ(li.title)));
    if (typoItem) {
      const correct = KNOWN_TYPO_NORM.get(normQ(typoItem.title));
      addResult(tab, edition, orderNum, sheetRowIndex,
        'TYPO',
        `Line item: "${typoItem.title}" — typo of "${correct}"`,
        customer, rec.rawNote);
      continue;
    }

    // ── 3. Confirmation ───────────────────────────────────────────────────
    // a) via current Shopify title (direct line item, matched by ground-truth)
    const currentDirect = confirmedDirect.includes(tab);
    // b) via old product name = tab name (for the 5 renamed products)
    //    The tab name IS the old Shopify title — old orders have it as their line item.
    const oldNameDirect = lineItems.some(li => normQ(li.title) === normQ(tab));
    // c) via bundle parent
    const bundleConfirm = confirmedBundle.includes(tab);

    const isConfirmedDirect = currentDirect || oldNameDirect;
    const isConfirmed       = isConfirmedDirect || bundleConfirm;
    const isBundleOnly      = !isConfirmedDirect && bundleConfirm;

    if (!isConfirmed) {
      addResult(tab, edition, orderNum, sheetRowIndex,
        'INVALID',
        `Product not confirmed — no matching line item or bundle parent found. ` +
        `Shopify title checked: "${shopifyTitle}". ` +
        `Line items: ${lineItems.map(l => `"${l.title}"`).join(', ') || '(none)'}`,
        customer, rec.rawNote);
      continue;
    }

    // ── 4. DUPLICATE note line ────────────────────────────────────────────
    const dupEntry = duplicateLines.find(d => normQ(d.line) === normQ(expectedLine));
    if (dupEntry) {
      addResult(tab, edition, orderNum, sheetRowIndex,
        'MANUAL REVIEW',
        `Duplicate note line: "${expectedLine}" appears ${dupEntry.count}× in note`,
        customer, rec.rawNote);
      continue;
    }

    // ── 5. LEGACY format ──────────────────────────────────────────────────
    // Note uses Shopify-title format instead of tab-name format
    const legacyEntry = extraInNote.find(e =>
      e.canonicalTab === tab &&
      e.format === 'SHOPIFY_TITLE' &&
      normQ(e.edition) === normQ(edition)
    );
    if (legacyEntry) {
      addResult(tab, edition, orderNum, sheetRowIndex,
        'LEGACY',
        `Note has Shopify-title format: "${legacyEntry.raw}" — expected tab-name format: "${expectedLine}"`,
        customer, rec.rawNote);
      continue;
    }

    // ── 6. Non-standard edition number ───────────────────────────────────
    if (isNonStandardEdition(edition)) {
      addResult(tab, edition, orderNum, sheetRowIndex,
        'MANUAL REVIEW',
        `Non-standard edition number: ${edition} (value > ${NON_STANDARD_THRESHOLD} — likely a year, not a serial)`,
        customer, rec.rawNote);
      continue;
    }

    // ── 7. Edition mismatch: expected edition absent AND a different edition present ──
    // Only flag if the expected edition is NOT in the note — multi-edition orders
    // legitimately have multiple lines for the same tab, all correct.
    const isExpectedInNote = presentInNote.some(l => normQ(l) === normQ(expectedLine));
    if (!isExpectedInNote) {
      const mismatchLine = parsedLines.find(p =>
        p.canonicalTab === tab &&
        normQ(p.edition) !== normQ(edition) &&
        !extraInNote.some(e => normQ(e.raw) === normQ(p.raw))
      );
      if (mismatchLine) {
        addResult(tab, edition, orderNum, sheetRowIndex,
          'MANUAL REVIEW',
          `Note has "${mismatchLine.raw}" but worksheet expects edition ${edition} — possible edition swap`,
          customer, rec.rawNote);
        continue;
      }
    }

    // ── 8. BUNDLE: confirmed via bundle only ─────────────────────────────
    if (isBundleOnly) {
      const bundleParent = rec.bundleParent || '(unknown bundle parent)';
      const noteStatus   = presentInNote.some(l => normQ(l) === normQ(expectedLine))
        ? 'NOTE PRESENT' : 'NOTE MISSING';
      addResult(tab, edition, orderNum, sheetRowIndex,
        'BUNDLE',
        `Confirmed via bundle parent "${bundleParent}"; component note line ${noteStatus}`,
        customer, rec.rawNote);
      continue;
    }

    // ── 9. VALID ──────────────────────────────────────────────────────────
    const noteStatus = presentInNote.some(l => normQ(l) === normQ(expectedLine))
      ? 'NOTE CORRECT'
      : missingFromNote.some(l => normQ(l) === normQ(expectedLine))
        ? 'NOTE MISSING — will need sync'
        : 'NOTE PRESENT (verify extra lines)';
    const confirmSrc = currentDirect  ? 'current Shopify title'
                     : oldNameDirect   ? 'old product name (pre-rename)'
                     : 'direct';
    addResult(tab, edition, orderNum, sheetRowIndex,
      'VALID',
      `Confirmed direct (${confirmSrc}); ${noteStatus}`,
      customer, rec.rawNote);
  }
}

// ─── Write JSON ──────────────────────────────────────────────────────────────
writeFileSync('phase2-validation.json', JSON.stringify({ totals, results }, null, 2));

// ─── Print report ─────────────────────────────────────────────────────────────
const W = 70;
const hr = '═'.repeat(W);
const div = '─'.repeat(W);

console.log('\n' + hr);
console.log('  PHASE 2 — WORKSHEET VALIDATION REPORT');
console.log(hr);
console.log(`  Total rows validated : ${results.length}`);
console.log(`  VALID                : ${totals.VALID}`);
console.log(`  BUNDLE               : ${totals.BUNDLE}`);
console.log(`  LEGACY               : ${totals.LEGACY}`);
console.log(`  TYPO                 : ${totals.TYPO}`);
console.log(`  INVALID              : ${totals.INVALID}`);
console.log(`  MANUAL REVIEW        : ${totals['MANUAL REVIEW']}`);
console.log(hr);

// Per-tab breakdown
console.log('\nPER-TAB BREAKDOWN\n');
for (const [tab, rows] of Object.entries(worksheetData)) {
  const tabResults = results.filter(r => r.tab === tab);
  const counts = {};
  for (const r of tabResults) counts[r.status] = (counts[r.status] || 0) + 1;
  const summary = ['VALID','BUNDLE','LEGACY','TYPO','INVALID','MANUAL REVIEW']
    .filter(s => counts[s])
    .map(s => `${s}:${counts[s]}`)
    .join('  ');
  console.log(`  "${tab}"`);
  console.log(`    ${rows.length} rows  →  ${summary || '(empty)'}`);
  console.log();
}

// Detailed non-VALID rows
for (const status of ['TYPO', 'INVALID', 'LEGACY', 'MANUAL REVIEW']) {
  const group = results.filter(r => r.status === status);
  if (!group.length) continue;
  console.log(div);
  console.log(`  ${status} — ${group.length} row(s)`);
  console.log(div);
  for (const r of group) {
    console.log(`  #${r.orderNum}  ${r.customer || ''}  |  Edition: ${r.edition}  |  Row: ${r.sheetRowIndex}`);
    console.log(`  Tab: "${r.tab}"`);
    console.log(`  ${r.reason}`);
    if (r.rawNote && r.rawNote.trim()) {
      const lines = r.rawNote.split('\n').map(l => l.trim()).filter(Boolean);
      console.log(`  Note (${lines.length} line${lines.length !== 1 ? 's' : ''}):`);
      for (const l of lines) console.log(`    ${l}`);
    }
    console.log();
  }
}

console.log(hr);
console.log('  Phase 2 complete. Output: phase2-validation.json');
console.log(hr);
