/**
 * phase5-risk-audit.mjs  --  PHASE 5: Safety Audit of Simulated Changes
 *
 * READ ONLY. No network. No Shopify writes.
 * Audits every simulated change from phase4-simulation.json.
 *
 * Risk levels:
 *   CRITICAL — data would be permanently and irreversibly destroyed
 *   HIGH     — data would change in a way that cannot be undone without
 *              manual effort and external reference
 *   MEDIUM   — change is reversible or the risk is conditional
 *   LOW      — change is pending a decision; no risk until approved
 */

import { readFileSync, writeFileSync } from 'fs';

const gt = JSON.parse(readFileSync('ground-truth.json',       'utf8'));
const p4 = JSON.parse(readFileSync('phase4-simulation.json',  'utf8'));

const { records, worksheetData } = gt;
const simulations = p4.simulations;

// ─── Authoritative tab → Shopify title map ────────────────────────────────────
const TAB_TO_SHOPIFY = {
  'THE 18 - EE SALA CUP NAMDU':                        'THE 18 - EE SALA CUP NAMDU',
  'World T20 Champions Edition - 2026':                 'World Champions 2026 - T20 Edition',
  "2007 : The Birth of India's T20 Era":                "2007 : The Birth of India's T20 Era",
  'THE 2011 WORLD CUP CHAMPIONS EDITION':               '2011 WORLD CUP CHAMPIONS EDITION',
  '1983 World Cup Edition : Become the Belief':         '1983 WC : Become the Belief',
  'God of Cricket : 100 Centuries Edition':             'God of Cricket : 100 Centuries Edition',
  'Hand Signed Ball | AS02':                            'Arshdeep Singh : Official Hand-Signed Leather Ball',
  'Arshdeep Singh Hand Signed 24 Carat Gold Edition':   'Arshdeep Singh Hand Signed 24 kt Gold Edition',
  'Shreyas Iyer Hand-Signed White Gold-Plated Artwork': 'Shreyas Iyer Hand-Signed White Gold-Plated Artwork',
  'AS02 Player Edition Cap : Arshdeep Singh':           'AS02 Player Edition Cap : Arshdeep Singh',
  'Ravi Bishnoi: Official Hand-Signed Ball':            'Ravi Bishnoi: Official Hand-Signed Ball',
};

const normQ = s =>
  s.replace(/[''‚‛]/g, "'")
   .replace(/[""„‟]/g, '"');

// ─── Risk registry ────────────────────────────────────────────────────────────
const risks = [];

function addRisk(level, category, orderNum, customer, finding, detail, canProceed) {
  risks.push({ level, category, orderNum, customer, finding, detail, canProceed });
}

// ─── Check every simulation ───────────────────────────────────────────────────
for (const sim of simulations) {
  const { orderNum, customer } = sim;
  const rec = records[orderNum];

  // ── RISK A: DATA LOSS — line removed with edition NOT preserved in replacement ──
  // Any line that is removed must have its edition number preserved in the
  // replacement line (same edition, different format = format change, not data loss).
  // If the edition is different, the original certificate record is permanently lost.

  // Collect all lines that would be removed
  const removedLines = [];
  for (const ea of sim.expectedActions) {
    if (ea.action === 'REPLACE') removedLines.push({ line: ea.legacyLine, replacedBy: ea.line });
  }
  for (const xa of sim.extraActions) {
    if (xa.action === 'LEGACY_REMOVE') removedLines.push({ line: xa.line, replacedBy: null });
  }

  for (const { line, replacedBy } of removedLines) {
    // Parse edition from the removed line
    const removedEdition = line ? line.split('|').pop()?.trim() : null;

    if (replacedBy) {
      // REPLACE: check if edition is preserved
      const replacedEdition = replacedBy.split('|').pop()?.trim();
      if (!removedEdition || !replacedEdition || normQ(removedEdition) !== normQ(replacedEdition)) {
        addRisk('CRITICAL', 'DATA_LOSS', orderNum, customer,
          `REPLACE removes edition ${removedEdition} — replacement has edition ${replacedEdition} — different editions`,
          `Line removed: "${line}" | Line added: "${replacedBy}"`,
          false
        );
      } else {
        // Same edition — format change only, not data loss; still a MEDIUM risk (atomicity)
        addRisk('MEDIUM', 'REPLACE_ATOMICITY', orderNum, customer,
          `REPLACE changes format of "${line}" to "${replacedBy}"`,
          `Edition ${removedEdition} is preserved. Risk: if the operation fails mid-write, ` +
          `the note could be left without either the old or the new line.`,
          true
        );
      }
    } else {
      // LEGACY_REMOVE with no replacement — edition is permanently deleted
      // Check: is this edition anywhere in the expected lines for this order?
      const expectedEditionsForTab = (sim.expectedActions)
        .map(ea => ea.line?.split('|').pop()?.trim())
        .filter(Boolean);
      if (!expectedEditionsForTab.includes(removedEdition)) {
        addRisk('CRITICAL', 'DATA_LOSS', orderNum, customer,
          `LEGACY_REMOVE deletes "${line}" — edition ${removedEdition} has NO corresponding ` +
          `expected line in the worksheet — this certificate record would be permanently lost`,
          `The worksheet for this order has no entry for edition ${removedEdition}. ` +
          `Shopify line item qty=${(rec?.lineItems||[]).reduce((s,l)=>s+l.quantity,0)}. ` +
          `Removed line has no replacement — data is not recoverable from project data alone.`,
          false
        );
      }
    }
  }

  // ── RISK B: QTY MISMATCH — Shopify qty exceeds worksheet rows for same tab/order ──
  for (const tab of Object.keys(TAB_TO_SHOPIFY)) {
    const shopifyTitle = TAB_TO_SHOPIFY[tab];
    const wsRows = (worksheetData[tab] || []).filter(r => r.orderNum === orderNum);
    if (wsRows.length === 0) continue;

    const shopifyQty = (rec?.lineItems || [])
      .filter(li => li.title === shopifyTitle || li.title === tab)
      .reduce((s, li) => s + li.quantity, 0);

    if (shopifyQty > wsRows.length) {
      addRisk('CRITICAL', 'DATA_CONFLICT', orderNum, customer,
        `Shopify has qty=${shopifyQty} for "${shopifyTitle}" ` +
        `but worksheet has only ${wsRows.length} row(s) for this order in tab "${tab}"`,
        `Worksheet editions: ${wsRows.map(r => r.edition).join(', ')}. ` +
        `Current note lines for this product: ` +
        `${(rec?.parsedNoteLines||[]).filter(p => p.canonicalTab === tab).map(p => p.raw).join(' | ') || '(none)'}. ` +
        `The worksheet does not fully account for all purchased units — ` +
        `any write to this order's note risks overwriting or losing certificate data ` +
        `for the un-worksheeted units.`,
        false
      );
    }
  }

  // ── RISK C: EXTRA_FLAG — note contains lines for products not confirmed ──
  for (const xa of sim.extraActions) {
    if (xa.action === 'EXTRA_FLAG') {
      addRisk('HIGH', 'UNCONFIRMED_NOTE_LINE', orderNum, customer,
        `Note contains "${xa.line}" — this product is NOT confirmed by any Shopify line item`,
        `${xa.detail}. ` +
        `This line exists in the current note and will NOT be touched by the sync — ` +
        `but its presence indicates possible data entry error or manual note corruption. ` +
        `If this is a valid certificate, the Shopify order or worksheet is missing data.`,
        true
      );
    }
  }

  // ── RISK D: TYPO — any write to a typo-affected order is unsafe ──
  const blockedLines = sim.expectedActions.filter(ea => ea.action === 'BLOCKED');
  if (blockedLines.length > 0) {
    addRisk('HIGH', 'TYPO_BLOCKED', orderNum, customer,
      `Shopify line item has a typo — the canonical product name cannot be confirmed. ` +
      `${blockedLines.length} expected note line(s) are blocked from being written.`,
      `Blocked lines: ${blockedLines.map(b => `"${b.line}"`).join(', ')}. ` +
      `Current note has "${(rec?.rawNote||'').split('\n')[0]}" (contains the typo). ` +
      `Any write to this order before the typo is corrected in Shopify is unsafe — ` +
      `the note already has the wrong product name, and adding correct-format lines ` +
      `alongside the typo line creates an inconsistent state.`,
      false
    );
  }

  // ── RISK E: MANUAL — non-standard editions or duplicates ──
  const manualLines = sim.expectedActions.filter(ea => ea.action === 'MANUAL');
  for (const m of manualLines) {
    addRisk('MEDIUM', 'MANUAL_REVIEW', orderNum, customer,
      `Line requires manual decision before any action: "${m.line}"`,
      m.detail,
      false
    );
  }

  // ── RISK F: BUNDLE — 98 lines pending explicit approval ──
  const bundleLines = sim.expectedActions.filter(ea => ea.action === 'BUNDLE');
  if (bundleLines.length > 0) {
    addRisk('LOW', 'BUNDLE_PENDING', orderNum, customer,
      `${bundleLines.length} bundle component note line(s) pending approval`,
      `Lines: ${bundleLines.map(b => `"${b.line}"`).join(', ')}. ` +
      `Cannot write until bundle sub-component note policy is approved.`,
      false
    );
  }

  // ── RISK G: EXTRA_UNKNOWN — unrecognized lines in note ──
  for (const xa of sim.extraActions) {
    if (xa.action === 'EXTRA_UNKNOWN') {
      addRisk('MEDIUM', 'EXTRA_UNKNOWN', orderNum, customer,
        `Note contains unrecognized line: "${xa.line}"`,
        `${xa.detail}. Cannot classify this line — origin unknown.`,
        true
      );
    }
  }

  // ── RISK H: MIXED FORMAT after REPLACE ──
  // If a REPLACE is done but OTHER extra lines in the same note stay in
  // Shopify-title format, the resulting note is mixed-format (inconsistent).
  const replaceLines = sim.expectedActions.filter(ea => ea.action === 'REPLACE');
  const extraKeep    = sim.extraActions.filter(xa => xa.action === 'EXTRA_KEEP');
  if (replaceLines.length > 0 && extraKeep.length > 0) {
    addRisk('MEDIUM', 'MIXED_FORMAT_AFTER_SYNC', orderNum, customer,
      `After REPLACE, note would still contain ${extraKeep.length} extra line(s) in ` +
      `Shopify-title format (not touched by sync)`,
      `Replaced: ${replaceLines.map(r => `"${r.legacyLine}" → "${r.line}"`).join('; ')}. ` +
      `Kept as-is (Shopify-title format): ${extraKeep.map(e => `"${e.line}"`).join(', ')}. ` +
      `Result: 1983 line would be in tab-name format, T20 and 2011 lines remain in ` +
      `Shopify-title format — inconsistent within the same note.`,
      true
    );
  }
}

// ─── Summarise ────────────────────────────────────────────────────────────────
const CRITICAL   = risks.filter(r => r.level === 'CRITICAL');
const HIGH       = risks.filter(r => r.level === 'HIGH');
const MEDIUM     = risks.filter(r => r.level === 'MEDIUM');
const LOW        = risks.filter(r => r.level === 'LOW');
const stopAll    = risks.some(r => !r.canProceed);
const safeToRun  = risks.filter(r => r.canProceed);
const unsafeRuns = risks.filter(r => !r.canProceed);

writeFileSync('phase5-risk-report.json', JSON.stringify({ stopAll, risks }, null, 2));

// ─── Print report ─────────────────────────────────────────────────────────────
const W  = 76;
const hr = '═'.repeat(W);
const dv = '─'.repeat(W);

console.log('\n' + hr);
console.log('  PHASE 5 — RISK AUDIT REPORT');
console.log(hr);

if (stopAll) {
  console.log('\n  ██████████████████████████████████████████████████████████');
  console.log('  ██                                                        ██');
  console.log('  ██   STOP — UNSAFE UPDATES DETECTED. DO NOT PROCEED.     ██');
  console.log('  ██                                                        ██');
  console.log('  ██████████████████████████████████████████████████████████');
}

console.log(`\n  CRITICAL : ${CRITICAL.length}  (irreversible data destruction)`);
console.log(`  HIGH     : ${HIGH.length}  (significant risk without manual recovery)`);
console.log(`  MEDIUM   : ${MEDIUM.length}  (conditional or recoverable risk)`);
console.log(`  LOW      : ${LOW.length}  (pending approval — no risk until acted on)`);
console.log(`\n  Total risks      : ${risks.length}`);
console.log(`  Unsafe (STOP)    : ${unsafeRuns.length}`);
console.log(`  Conditionally OK : ${safeToRun.length}`);
console.log(hr);

// Detail per level
for (const [label, group] of [['CRITICAL', CRITICAL], ['HIGH', HIGH], ['MEDIUM', MEDIUM], ['LOW', LOW]]) {
  if (!group.length) continue;
  console.log(`\n${'▓'.repeat(W)}`);
  console.log(`  ${label} RISKS — ${group.length}`);
  console.log('▓'.repeat(W));
  for (const r of group) {
    console.log(`\n  #${r.orderNum}  ${r.customer}  [${r.category}]`);
    console.log(`  ${r.finding}`);
    console.log(`  ${r.detail}`);
    console.log(`  CAN PROCEED: ${r.canProceed ? 'YES (conditional)' : 'NO — BLOCKED'}`);
  }
}

// Which orders are safe to update (only MEDIUM/LOW canProceed=true risks)
const affectedOrders = new Set(unsafeRuns.map(r => r.orderNum));
const safeOrders     = simulations
  .filter(s => {
    const hasRealChange = s.expectedActions.some(ea => ['ADD','REPLACE'].includes(ea.action));
    const isUnsafe      = affectedOrders.has(s.orderNum);
    return hasRealChange && !isUnsafe;
  })
  .map(s => s.orderNum);

console.log('\n' + hr);
console.log('  SAFE TO PROCEED (ADD / REPLACE actions only, no CRITICAL/HIGH STOP risks):');
if (safeOrders.length) {
  console.log(`  ${safeOrders.length} orders: ` + safeOrders.map(n => '#' + n).join(', '));
} else {
  console.log('  (none)');
}

console.log('\n  MUST NOT PROCEED — orders with at least one STOP risk:');
const stopOrders = [...new Set(unsafeRuns.map(r => r.orderNum))].sort((a,b)=>+a-+b);
for (const o of stopOrders) {
  const reasons = unsafeRuns.filter(r => r.orderNum === o).map(r => r.category);
  console.log(`  #${o}  ${records[o]?.customer?.name || ''}  →  ${[...new Set(reasons)].join(', ')}`);
}

console.log('\n' + hr);
console.log('  DECISION REQUIRED BEFORE ANY SYNC CAN RUN:');
console.log(dv);
const decisionsNeeded = [
  ...CRITICAL.map(r => ({ priority: 1, text: `[CRITICAL] Resolve DATA_CONFLICT / DATA_LOSS for #${r.orderNum}` })),
  ...HIGH.filter(r => r.category === 'TYPO_BLOCKED').map(r => ({ priority: 2, text: `[HIGH] Fix NAMDE typo in Shopify for #${r.orderNum} before writing any note` })),
  ...HIGH.filter(r => r.category === 'UNCONFIRMED_NOTE_LINE').map(r => ({ priority: 2, text: `[HIGH] Investigate unconfirmed note line in #${r.orderNum}: ${r.finding.split('"')[1]}` })),
  ...MEDIUM.filter(r => r.category === 'MANUAL_REVIEW').map(r => ({ priority: 3, text: `[MANUAL] Review #${r.orderNum}: ${r.detail.split('—')[0]?.trim()}` })),
  { priority: 4, text: '[PENDING] Approve or reject BUNDLE sub-component note lines (98 lines, 21 orders)' },
  { priority: 4, text: '[PENDING] Approve REPLACE for legacy-format lines (#1496, #1508)' },
];
for (const d of decisionsNeeded.sort((a,b)=>a.priority-b.priority)) {
  console.log(`  ${d.text}`);
}

console.log('\n' + hr);
console.log('  Phase 5 complete. Output: phase5-risk-report.json');
console.log(hr);
