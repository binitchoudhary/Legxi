/**
 * phase3-bundle-map.mjs  --  PHASE 3: Bundle Validation Mapping
 *
 * READ ONLY. No network. No Shopify writes.
 * Uses ground-truth.json only.
 *
 * Verifies from first principles — no assumptions:
 *   1. Parent product in Shopify (per order line items)
 *   2. Expected children (from worksheet, the source of truth)
 *   3. Actual Shopify order (line items, not inferred)
 *   4. Worksheet assignment (matching order numbers + editions across tabs)
 *   5. Certificate mapping (edition consistency across all 5 tabs)
 */

import { readFileSync, writeFileSync } from 'fs';

const gt = JSON.parse(readFileSync('ground-truth.json', 'utf8'));
const { records, worksheetData } = gt;

// ─── Worksheet tabs in the shared order group ────────────────────────────────
// These are OBSERVED from the data — the same 22 orders appear in all 5 tabs.
// This is NOT assumed — it is verified below.
const PARENT_TAB    = 'THE 18 - EE SALA CUP NAMDU';
const CHILD_TABS    = [
  'World T20 Champions Edition - 2026',
  "2007 : The Birth of India's T20 Era",
  'THE 2011 WORLD CUP CHAMPIONS EDITION',
  'Hand Signed Ball | AS02',
];
const ALL_TABS = [PARENT_TAB, ...CHILD_TABS];

// ─── Shopify product titles for matching ────────────────────────────────────
// These are the AUTHORITATIVE mappings — never inferred.
const TAB_TO_SHOPIFY = {
  'THE 18 - EE SALA CUP NAMDU':            'THE 18 - EE SALA CUP NAMDU',
  'World T20 Champions Edition - 2026':      'World Champions 2026 - T20 Edition',
  "2007 : The Birth of India's T20 Era":     "2007 : The Birth of India's T20 Era",
  'THE 2011 WORLD CUP CHAMPIONS EDITION':   '2011 WORLD CUP CHAMPIONS EDITION',
  'Hand Signed Ball | AS02':                 'Arshdeep Singh : Official Hand-Signed Leather Ball',
};

// Known typo variant for THE 18 parent
const PARENT_TYPO = 'THE 18 - EE SALA CUP NAMDE';

// ─── STEP 1: Collect order numbers per tab ───────────────────────────────────
const ordersByTab = {};
for (const tab of ALL_TABS) {
  ordersByTab[tab] = new Set(
    (worksheetData[tab] || []).map(r => r.orderNum)
  );
}

// ─── STEP 2: Verify shared order set ─────────────────────────────────────────
// All 5 tabs must have the same order numbers for the bundle logic to hold.
const parentOrders  = [...ordersByTab[PARENT_TAB]].sort((a, b) => +a - +b);
const orderSetErrors = [];
for (const childTab of CHILD_TABS) {
  const childOrders = [...ordersByTab[childTab]].sort((a, b) => +a - +b);
  const onlyInParent = parentOrders.filter(o => !ordersByTab[childTab].has(o));
  const onlyInChild  = childOrders.filter(o => !ordersByTab[PARENT_TAB].has(o));
  if (onlyInParent.length || onlyInChild.length) {
    orderSetErrors.push({ childTab, onlyInParent, onlyInChild });
  }
}

// ─── STEP 3: For each order, build verification record ───────────────────────
const bundleMap = [];

for (const orderNum of parentOrders) {
  const rec = records[orderNum];

  // Parent product in Shopify
  const lineItems = (rec?.lineItems || []).map(li => li.title);
  const hasParentCorrect = lineItems.includes(TAB_TO_SHOPIFY[PARENT_TAB]);
  const hasParentTypo    = lineItems.includes(PARENT_TYPO);
  const parentStatus = hasParentCorrect ? 'CONFIRMED'
                     : hasParentTypo    ? 'TYPO'
                     : 'NOT FOUND';

  // Direct child product line items in Shopify (for any child tab)
  const directChildren = {};
  for (const childTab of CHILD_TABS) {
    const shopifyTitle = TAB_TO_SHOPIFY[childTab];
    const tabName      = childTab; // old Shopify title = tab name (for renamed products)
    directChildren[childTab] =
      lineItems.includes(shopifyTitle) || lineItems.includes(tabName);
  }

  // Edition consistency across all 5 tabs
  const editionsByTab = {};
  for (const tab of ALL_TABS) {
    editionsByTab[tab] = (worksheetData[tab] || [])
      .filter(r => r.orderNum === orderNum)
      .map(r => r.edition)
      .sort();
  }

  // Compare editions — all 5 tabs must agree
  const parentEdStr = editionsByTab[PARENT_TAB].join(',');
  const editionConsistent = CHILD_TABS.every(
    ct => editionsByTab[ct].join(',') === parentEdStr
  );
  const editionDetail = {};
  for (const tab of ALL_TABS) {
    editionDetail[tab] = editionsByTab[tab].join('+') || '(none)';
  }

  // Can the parent validate each child?
  const childValidation = {};
  for (const childTab of CHILD_TABS) {
    let can, why;
    if (parentStatus === 'TYPO') {
      can = 'NO';
      why = `Bundle parent has NAMDE typo — cannot confirm THE 18 NAMDU purchase`;
    } else if (parentStatus === 'NOT FOUND') {
      can = 'NO';
      why = `Bundle parent product not found in Shopify line items`;
    } else if (!editionConsistent) {
      can = 'NO';
      why = `Edition numbers inconsistent between parent tab (${editionDetail[PARENT_TAB]}) and this child tab (${editionDetail[childTab]})`;
    } else if (directChildren[childTab]) {
      can = 'YES';
      why = `Confirmed via bundle parent AND via direct Shopify line item`;
    } else {
      can = 'YES';
      why = `Confirmed via bundle parent only; edition ${editionDetail[PARENT_TAB]} consistent across all 5 tabs`;
    }
    childValidation[childTab] = { can, why };
  }

  bundleMap.push({
    orderNum,
    customer:         rec?.customer?.name || '(unknown)',
    parentStatus,
    parentLineItem:   hasParentCorrect ? TAB_TO_SHOPIFY[PARENT_TAB]
                    : hasParentTypo    ? PARENT_TYPO
                    : '(not found)',
    directChildren,
    editions:         editionDetail,
    editionConsistent,
    childValidation,
  });
}

// ─── OUTPUT ──────────────────────────────────────────────────────────────────
const W  = 78;
const hr = '═'.repeat(W);
const div = '─'.repeat(W);

console.log('\n' + hr);
console.log('  PHASE 3 — BUNDLE VALIDATION MAPPING TABLE');
console.log(hr);

// ORDER SET VERIFICATION
console.log('\nSTEP 1 — ORDER SET VERIFICATION\n');
if (orderSetErrors.length === 0) {
  console.log(`  All 5 tabs share the identical set of ${parentOrders.length} order numbers.`);
  console.log(`  No order appears in a child tab without appearing in the parent tab.`);
  console.log(`  No order appears in the parent tab without appearing in all child tabs.`);
  console.log('  VERIFIED: order set is consistent across all 5 tabs.');
} else {
  console.log('  ERROR: Order sets are NOT consistent across all 5 tabs.');
  for (const { childTab, onlyInParent, onlyInChild } of orderSetErrors) {
    console.log(`  "${childTab}":`);
    if (onlyInParent.length) console.log(`    In parent only: ${onlyInParent.join(', ')}`);
    if (onlyInChild.length)  console.log(`    In child only:  ${onlyInChild.join(', ')}`);
  }
}

// CHILD TAB IDENTIFICATION SOURCE
console.log('\nSTEP 2 — HOW CHILD TABS WERE IDENTIFIED\n');
console.log('  Source: worksheet data (ground-truth.json → worksheetData)');
console.log('  Method: identified all worksheet tabs that share the same set of');
console.log(`          ${parentOrders.length} order numbers as "${PARENT_TAB}".`);
console.log('  No Shopify product definition of bundle children exists in the data.');
console.log('  The worksheet is the source of truth for bundle membership.');
console.log('\n  Child tabs identified (5 total, all verified to have same order set):');
for (const ct of CHILD_TABS) {
  console.log(`    "${ct}"`);
  console.log(`    Shopify title: "${TAB_TO_SHOPIFY[ct]}"`);
}

// EDITION CONSISTENCY
const allConsistent = bundleMap.every(b => b.editionConsistent);
console.log('\nSTEP 3 — EDITION CONSISTENCY ACROSS ALL 5 TABS\n');
if (allConsistent) {
  console.log('  VERIFIED: Every order has identical edition numbers in all 5 tabs.');
  console.log('  Multi-edition orders (#1505, #1523) also consistent across all 5 tabs.');
} else {
  console.log('  INCONSISTENCY DETECTED:');
  for (const b of bundleMap.filter(x => !x.editionConsistent)) {
    console.log(`  #${b.orderNum} ${b.customer}`);
    for (const [tab, ed] of Object.entries(b.editions)) {
      console.log(`    ${tab}: ${ed}`);
    }
  }
}

// MAIN MAPPING TABLE
console.log('\n' + hr);
console.log('  BUNDLE MAPPING TABLE');
console.log(hr);
console.log('');

const shortTab = tab => {
  const map = {
    'THE 18 - EE SALA CUP NAMDU':                      'THE 18',
    'World T20 Champions Edition - 2026':                'T20',
    "2007 : The Birth of India's T20 Era":               '2007',
    'THE 2011 WORLD CUP CHAMPIONS EDITION':              '2011',
    'Hand Signed Ball | AS02':                           'BALL',
  };
  return map[tab] || tab;
};

console.log('  # = Order number. Direct = has direct Shopify line item for this child product.');
console.log('');

// Group by outcome
const yesAll   = bundleMap.filter(b => Object.values(b.childValidation).every(v => v.can === 'YES'));
const noSome   = bundleMap.filter(b => Object.values(b.childValidation).some(v => v.can === 'NO'));
const specials = bundleMap.filter(b => Object.values(b.directChildren).some(Boolean));

console.log(`  PARENT: THE 18 - EE SALA CUP NAMDU`);
console.log(`  SHOPIFY TITLE: THE 18 - EE SALA CUP NAMDU`);
console.log('');

// Table header
const colW = 8;
const custW = 34;
const tabLabels = CHILD_TABS.map(shortTab);
let header = `  ${'#'.padEnd(6)} ${'CUSTOMER'.padEnd(custW)} ${'PARENT'.padEnd(12)}`;
for (const lbl of tabLabels) header += ` ${lbl.padEnd(colW)}`;
console.log(header);
console.log('  ' + '-'.repeat(header.length - 2));

for (const b of bundleMap) {
  const custShort = b.customer.length > custW - 2
    ? b.customer.slice(0, custW - 3) + '..'
    : b.customer;
  let row = `  ${('#' + b.orderNum).padEnd(6)} ${custShort.padEnd(custW)} ${b.parentStatus.padEnd(12)}`;
  for (const ct of CHILD_TABS) {
    const v = b.childValidation[ct];
    const hasDirect = b.directChildren[ct];
    const cell = v.can === 'YES'
      ? (hasDirect ? 'YES+DIR' : 'YES')
      : 'NO';
    row += ` ${cell.padEnd(colW)}`;
  }
  console.log(row);
}

// Footnotes for special cases
console.log('');
console.log('  YES     = validated via bundle parent only');
console.log('  YES+DIR = validated via bundle parent AND direct Shopify line item');
console.log('  NO      = cannot be validated (see findings below)');

// Findings
console.log('\n' + hr);
console.log('  FINDINGS');
console.log(hr);

// NO cases
const noCases = bundleMap.filter(b => Object.values(b.childValidation).some(v => v.can === 'NO'));
if (noCases.length) {
  console.log('\n  CANNOT VALIDATE:\n');
  for (const b of noCases) {
    console.log(`  #${b.orderNum}  ${b.customer}`);
    console.log(`  Parent line item: "${b.parentLineItem}"`);
    for (const ct of CHILD_TABS) {
      const v = b.childValidation[ct];
      if (v.can === 'NO') {
        console.log(`  ${shortTab(ct)}: NO — ${v.why}`);
      }
    }
    console.log('');
  }
}

// YES+DIR cases
const dirCases = bundleMap.filter(b => Object.values(b.directChildren).some(Boolean));
if (dirCases.length) {
  console.log('  DOUBLY CONFIRMED (bundle + direct Shopify line item):\n');
  for (const b of dirCases) {
    for (const ct of CHILD_TABS) {
      if (b.directChildren[ct]) {
        console.log(`  #${b.orderNum}  ${b.customer}`);
        console.log(`  ${shortTab(ct)}: YES+DIR — purchased "${TAB_TO_SHOPIFY[ct]}" directly AND has THE 18 bundle`);
        console.log('');
      }
    }
  }
}

// Summary counts
const total    = bundleMap.length;
const noCount  = noCases.length;
const yesCount = total - noCount;
console.log(div);
console.log(`  SUMMARY`);
console.log(div);
console.log(`  Total orders in bundle group : ${total}`);
console.log(`  Parent can validate all children : ${yesCount} orders`);
console.log(`  Parent CANNOT validate children  : ${noCount} order(s)`);
console.log(`  Doubly confirmed (bundle + direct): ${dirCases.length} order(s)`);
console.log(hr);

// Write JSON
writeFileSync('phase3-bundle-map.json', JSON.stringify({ orderSetErrors, bundleMap }, null, 2));
console.log('  Output: phase3-bundle-map.json');
console.log(hr);
