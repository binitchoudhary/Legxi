/**
 * phase4-simulate.mjs  --  PHASE 4: Final Note Simulation
 *
 * READ ONLY. No network. No Shopify writes.
 * Uses ground-truth.json + phase2-validation.json only.
 *
 * For every worksheet-tracked order produces:
 *   Current Note   — exact Shopify note text today
 *   Expected Note  — what the note should contain (per worksheet + validation)
 *   Difference     — per-line action: ADD / KEEP / BUNDLE / REPLACE / BLOCKED /
 *                    MANUAL / DEDUP / EXTRA_KEEP / EXTRA_FLAG / EXTRA_UNKNOWN
 */

import { readFileSync, writeFileSync } from 'fs';

const gt = JSON.parse(readFileSync('ground-truth.json', 'utf8'));
const p2 = JSON.parse(readFileSync('phase2-validation.json', 'utf8'));

const { records, worksheetData } = gt;

const normQ = s =>
  s.replace(/[''‚‛]/g, "'")
   .replace(/[""„‟]/g, '"');

// ─── Index Phase 2 results by orderNum|tab|edition ───────────────────────────
const p2Index = new Map();
for (const r of p2.results) {
  p2Index.set(`${r.orderNum}||${r.tab}||${r.edition}`, r);
}

// ─── Collect all unique orders with worksheet data ────────────────────────────
const wsOrderNums = new Set();
for (const rows of Object.values(worksheetData)) {
  for (const { orderNum } of rows) wsOrderNums.add(orderNum);
}
const wsOrders = [...wsOrderNums]
  .sort((a, b) => +a - +b)
  .map(n => records[n])
  .filter(Boolean);

// ─── Build simulation for each order ─────────────────────────────────────────

// Action constants
const A = {
  KEEP           : 'KEEP',
  ADD            : 'ADD',
  BUNDLE         : 'BUNDLE',
  REPLACE        : 'REPLACE',
  BLOCKED        : 'BLOCKED',
  MANUAL         : 'MANUAL',
  DEDUP_REMOVE   : 'DEDUP_REMOVE',
  LEGACY_REMOVE  : 'LEGACY_REMOVE',
  EXTRA_KEEP     : 'EXTRA_KEEP',
  EXTRA_FLAG     : 'EXTRA_FLAG',
  EXTRA_UNKNOWN  : 'EXTRA_UNKNOWN',
};

const simulations = [];
const grandTotals = Object.fromEntries(Object.values(A).map(k => [k, 0]));

for (const rec of wsOrders) {
  const orderNum        = rec.orderNumber;
  const certs           = rec.worksheetCertificates || [];
  const expectedLines   = rec.expectedNoteLines     || [];
  const presentInNote   = rec.presentInNote         || [];
  const missingFromNote = rec.missingFromNote        || [];
  const duplicateLines  = rec.duplicateLines         || [];
  const extraInNote     = rec.extraInNote            || [];
  const parsedLines     = rec.parsedNoteLines        || [];
  const rawNote         = rec.rawNote                || '';
  const customer        = rec.customer?.name         || '(unknown)';

  // Lines in current note that are NOT related to any expected line
  // (raw note lines, in order)
  const currentLines = rawNote.split('\n').map(l => l.trim()).filter(Boolean);

  // Track which extra lines will be flagged as LEGACY_REMOVE (replaced)
  const legacyRaws = new Set(
    extraInNote
      .filter(e => e.category === 'LEGACY_FORMAT')
      .map(e => e.raw)
  );

  // ── Per expected line: determine action ──────────────────────────────────
  const expectedActions = expectedLines.map(line => {
    const cert = certs.find(c => normQ(`${c.tab}|${c.edition}`) === normQ(line));
    const p2key = cert ? `${orderNum}||${cert.tab}||${cert.edition}` : null;
    const p2r   = p2key ? p2Index.get(p2key) : null;
    const p2status = p2r?.status || 'UNKNOWN';

    const isPresent = presentInNote.some(l => normQ(l) === normQ(line));
    const isDup     = duplicateLines.some(d => normQ(d.line) === normQ(line));
    const dupCount  = isDup ? duplicateLines.find(d => normQ(d.line) === normQ(line))?.count : 1;

    // TYPO takes priority — if Phase 2 says TYPO, nothing can be written
    if (p2status === 'TYPO') {
      return { line, action: A.BLOCKED, detail: `TYPO in Shopify: "${rec.lineItems?.[0]?.title}" — canonical product name cannot be confirmed` };
    }

    // MANUAL REVIEW — cannot determine without human decision
    if (p2status === 'MANUAL REVIEW') {
      return { line, action: A.MANUAL, detail: p2r?.reason || 'Requires manual review' };
    }

    // LEGACY — note has Shopify-title format instead of tab-name format
    if (p2status === 'LEGACY') {
      const legacyEntry = extraInNote.find(e =>
        e.canonicalTab === cert?.tab &&
        e.format === 'SHOPIFY_TITLE' &&
        normQ(e.edition) === normQ(cert?.edition || '')
      );
      return {
        line,
        action:      A.REPLACE,
        legacyLine:  legacyEntry?.raw || '(legacy line)',
        detail:      `Remove "${legacyEntry?.raw}" — Add "${line}"`,
      };
    }

    // BUNDLE — confirmed via bundle parent only; component line not yet written
    if (p2status === 'BUNDLE') {
      if (isPresent) {
        return { line, action: A.KEEP, detail: 'Already correct (bundle line present)' };
      }
      return { line, action: A.BUNDLE, detail: `Bundle component line — awaiting decision` };
    }

    // VALID
    if (isDup) {
      return { line, action: A.DEDUP_REMOVE, count: dupCount, detail: `Appears ${dupCount}× — keep one, remove ${dupCount - 1} extra cop${dupCount - 1 === 1 ? 'y' : 'ies'}` };
    }
    if (isPresent) {
      return { line, action: A.KEEP, detail: 'Already correct' };
    }
    return { line, action: A.ADD, detail: 'Missing — will be added' };
  });

  // ── Per extra line (in note, not expected): determine action ─────────────
  // Build set of all lines accounted for in expectedActions
  const handledRaws = new Set(expectedActions.map(ea => normQ(ea.line)));
  // Also add legacy raw lines handled via REPLACE
  for (const ea of expectedActions) {
    if (ea.action === A.REPLACE && ea.legacyLine) {
      handledRaws.add(normQ(ea.legacyLine));
    }
  }

  const extraActions = [];
  for (const e of extraInNote) {
    // Skip if already accounted for in expected (e.g. legacy line handled by REPLACE)
    if (handledRaws.has(normQ(e.raw))) continue;

    let action, detail;
    switch (e.category) {
      case 'UNTRACKED_CERT':
        action = A.EXTRA_KEEP;
        detail = `Valid purchase (${e.canonicalTab || e.prefix || '?'}) — not in worksheet, kept as-is`;
        break;
      case 'WRONG_PRODUCT':
        action = A.EXTRA_FLAG;
        detail = `Product not confirmed for this order (${e.canonicalTab || e.prefix || '?'}) — flagged for review`;
        break;
      case 'LEGACY_FORMAT':
        // This case should be handled via REPLACE above, but catch any strays
        action = A.LEGACY_REMOVE;
        detail = `Legacy format — should be replaced (see REPLACE above)`;
        break;
      default:
        action = A.EXTRA_UNKNOWN;
        detail = `Unrecognized prefix — flagged for review`;
        break;
    }
    extraActions.push({ line: e.raw, action, detail });
  }

  // Also capture note lines with NO pipe (not parseable as certificate lines)
  const noPipeLines = parsedLines.filter(p => p.format === 'NO_PIPE');
  for (const np of noPipeLines) {
    if (!handledRaws.has(normQ(np.raw))) {
      extraActions.push({
        line:   np.raw,
        action: A.EXTRA_UNKNOWN,
        detail: 'No pipe separator — cannot parse as certificate line, kept as-is',
      });
    }
  }

  // ── Counts ─────────────────────────────────────────────────────────────────
  const counts = Object.fromEntries(Object.values(A).map(k => [k, 0]));
  for (const ea of expectedActions)  counts[ea.action]++;
  for (const ea of extraActions)     counts[ea.action]++;
  for (const k of Object.keys(counts)) grandTotals[k] += counts[k];

  simulations.push({
    orderNum,
    customer,
    currentNote:     rawNote,
    currentLines,
    expectedActions,
    extraActions,
    counts,
    hasChanges: counts[A.ADD] + counts[A.REPLACE] + counts[A.BUNDLE] +
                counts[A.BLOCKED] + counts[A.MANUAL] + counts[A.DEDUP_REMOVE] +
                counts[A.EXTRA_FLAG] + counts[A.EXTRA_UNKNOWN] > 0,
  });
}

// ─── Write JSON ───────────────────────────────────────────────────────────────
writeFileSync('phase4-simulation.json', JSON.stringify({ grandTotals, simulations }, null, 2));

// ─── Print report ─────────────────────────────────────────────────────────────
const W  = 76;
const hr = '═'.repeat(W);
const div = '─'.repeat(W);

const pad = (s, n) => String(s).padEnd(n);

console.log('\n' + hr);
console.log('  PHASE 4 — FINAL NOTE SIMULATION');
console.log(hr);
console.log(`  Orders simulated : ${simulations.length}`);
console.log(`  KEEP             : ${grandTotals[A.KEEP]}  (lines already correct — no change)`);
console.log(`  ADD              : ${grandTotals[A.ADD]}  (missing lines — would be added)`);
console.log(`  BUNDLE           : ${grandTotals[A.BUNDLE]}  (bundle component lines — PENDING DECISION)`);
console.log(`  REPLACE          : ${grandTotals[A.REPLACE]}  (legacy format → correct format)`);
console.log(`  BLOCKED          : ${grandTotals[A.BLOCKED]}  (typo in Shopify — cannot write)`);
console.log(`  MANUAL           : ${grandTotals[A.MANUAL]}  (manual review required)`);
console.log(`  DEDUP_REMOVE     : ${grandTotals[A.DEDUP_REMOVE]}  (duplicate lines to remove)`);
console.log(`  EXTRA_KEEP       : ${grandTotals[A.EXTRA_KEEP]}  (valid purchases not in worksheet — kept)`);
console.log(`  EXTRA_FLAG       : ${grandTotals[A.EXTRA_FLAG]}  (unconfirmed product lines — flagged)`);
console.log(`  EXTRA_UNKNOWN    : ${grandTotals[A.EXTRA_UNKNOWN]}  (unrecognized lines — flagged)`);
console.log(hr);

// Per-order details
// Show all orders that have changes; then orders with no changes as a compact list

const changedOrders = simulations.filter(s => s.hasChanges);
const cleanOrders   = simulations.filter(s => !s.hasChanges);

console.log(`\n  ${changedOrders.length} orders require changes · ${cleanOrders.length} orders already correct\n`);

// ── ORDERS THAT REQUIRE CHANGES ────────────────────────────────────────────
console.log(hr);
console.log('  ORDERS WITH CHANGES');
console.log(hr);

for (const sim of changedOrders) {
  console.log('\n' + div);
  console.log(`  #${sim.orderNum}  ${sim.customer}`);
  console.log(div);

  // Current note
  if (sim.currentLines.length) {
    console.log('  CURRENT NOTE:');
    for (const l of sim.currentLines) console.log(`    ${l}`);
  } else {
    console.log('  CURRENT NOTE: (empty)');
  }

  console.log('');
  console.log('  SIMULATED CHANGES:');

  // Print expected line actions
  for (const ea of sim.expectedActions) {
    const marker = {
      [A.KEEP]:         '[=]',
      [A.ADD]:          '[+]',
      [A.BUNDLE]:       '[?]',
      [A.REPLACE]:      '[~]',
      [A.BLOCKED]:      '[!]',
      [A.MANUAL]:       '[??]',
      [A.DEDUP_REMOVE]: '[-]',
    }[ea.action] || '[?]';

    if (ea.action === A.REPLACE) {
      console.log(`    ${marker} REPLACE  "${ea.legacyLine}"`);
      console.log(`             → "${ea.line}"`);
    } else if (ea.action === A.DEDUP_REMOVE) {
      console.log(`    ${marker} DEDUP    "${ea.line}"  (${ea.count}× → keep 1, remove ${ea.count - 1})`);
    } else if (ea.action === A.KEEP) {
      // Skip KEEP in changed-orders section to reduce noise — only show non-KEEP
    } else {
      const label = pad(ea.action, 8);
      console.log(`    ${marker} ${label} "${ea.line}"`);
      if (ea.action === A.MANUAL || ea.action === A.BLOCKED) {
        console.log(`             → ${ea.detail}`);
      }
    }
  }

  // Print extra line actions
  for (const xa of sim.extraActions) {
    const marker = {
      [A.EXTRA_KEEP]:    '[~]',
      [A.EXTRA_FLAG]:    '[!]',
      [A.LEGACY_REMOVE]: '[-]',
      [A.EXTRA_UNKNOWN]: '[?]',
    }[xa.action] || '[?]';
    const label = pad(xa.action, 14);
    console.log(`    ${marker} ${label} "${xa.line}"`);
    if (xa.action === A.EXTRA_FLAG || xa.action === A.EXTRA_UNKNOWN) {
      console.log(`             → ${xa.detail}`);
    }
  }

  // Summary for this order
  const parts = [];
  if (sim.counts[A.ADD])          parts.push(`ADD:${sim.counts[A.ADD]}`);
  if (sim.counts[A.BUNDLE])       parts.push(`BUNDLE:${sim.counts[A.BUNDLE]} (pending)`);
  if (sim.counts[A.REPLACE])      parts.push(`REPLACE:${sim.counts[A.REPLACE]}`);
  if (sim.counts[A.BLOCKED])      parts.push(`BLOCKED:${sim.counts[A.BLOCKED]}`);
  if (sim.counts[A.MANUAL])       parts.push(`MANUAL:${sim.counts[A.MANUAL]}`);
  if (sim.counts[A.DEDUP_REMOVE]) parts.push(`DEDUP:${sim.counts[A.DEDUP_REMOVE]}`);
  if (sim.counts[A.EXTRA_FLAG])   parts.push(`FLAG:${sim.counts[A.EXTRA_FLAG]}`);
  if (sim.counts[A.EXTRA_UNKNOWN])parts.push(`UNKNOWN:${sim.counts[A.EXTRA_UNKNOWN]}`);
  console.log(`\n  → ${parts.join('  ')}`);
}

// ── CLEAN ORDERS (no changes needed) ──────────────────────────────────────────
if (cleanOrders.length) {
  console.log('\n\n' + hr);
  console.log('  ORDERS ALREADY CORRECT (no changes needed)');
  console.log(hr);
  let lineCount = 0;
  for (const sim of cleanOrders) {
    const lines = sim.currentLines.length;
    process.stdout.write(`  #${sim.orderNum} (${lines}L)  `.padEnd(20));
    lineCount++;
    if (lineCount % 4 === 0) process.stdout.write('\n');
  }
  if (lineCount % 4 !== 0) process.stdout.write('\n');
}

console.log('\n' + hr);
console.log('  Phase 4 complete. Output: phase4-simulation.json');
console.log(hr);
