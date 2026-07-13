// Ported verbatim from functions/index.js (post edition-#136 fix). No logic changes.
function detectEditionType(item) {
  const all = [item.title || '', item.variant_title || '', item.sku || '', item.name || '',
    (item.properties || []).map(p => `${p.name} ${p.value}`).join(' ')].join(' ').toLowerCase();
  if (/artisan/.test(all)) return 'artisan';
  if (/signed/.test(all))  return 'signed';
  return null;
}

export function normalizeEditionNum(val) {
  if (!val) return null;
  const s = String(val).trim();
  const slash = s.match(/^(\d+)\s*[/]\s*\d+/);
  if (slash) return '#' + String(parseInt(slash[1], 10)).padStart(3, '0');
  const num = s.match(/#?(\d+)/);
  if (num) return '#' + String(parseInt(num[1], 10)).padStart(3, '0');
  return null;
}

export function normalizeTitleForGrouping(title) {
  return (title || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

// Resolves edition numbers for ALL line items of ONE order in a single pass, so that
// editions already claimed by a self-identifying line item (priority 1/2 below) are
// reserved before any ambiguous line item is allowed to draw from the order-note pool.
//
// This two-pass shape matters: within one order, several line items can share the exact
// same title (one line per unit purchased). Some of those line items self-identify their
// edition via variant title or a line-item property; others carry a generic variant like
// "SYSTEM ASSIGNED (AUTO)" and can only be resolved from the order note. If we resolved
// items one at a time in GraphQL response order, a generic item processed before its
// self-identifying siblings could steal an edition from the note pool that a later,
// self-identifying item was always going to claim anyway — leaving the pool short and
// silently dropping whichever edition never gets assigned. Reserving self-identified
// editions FIRST (pass 1), then handing out only what's left (pass 2), makes the result
// independent of line item order.
//
// Priority per line item:
//   1. Variant title (explicit, unambiguous — e.g. "EDITION #002")
//   2. Line item property ("Edition Number" custom attribute)
//   3. Product/variant metafield carrying an edition number — not used by any product in
//      this store today (only custom.edition_type exists, which is the artisan/signed
//      TYPE, not the numbered edition); reserved here so a future metafield-based edition
//      number is picked up without another priority-order change.
//   4. Remaining unassigned edition from this order's note, grouped by normalized product
//      title. Each edition in the pool is consumed exactly once, so two line items with
//      the same title can never be assigned the same edition number.
export function resolveOrderEditions(items, noteData) {
  const results = new Array(items.length).fill(null);
  const pendingIdx = [];

  // Pass 1 — self-identifying items (variant title, then line-item property).
  items.forEach((item, i) => {
    const vtNum = normalizeEditionNum(item.variant_title);
    if (vtNum) { results[i] = vtNum; return; }
    for (const p of (item.properties || [])) {
      if (/^edition\s*(number)?$/i.test(p.name.trim())) {
        const n = normalizeEditionNum(p.value);
        if (n) { results[i] = n; return; }
      }
    }
    pendingIdx.push(i);
  });

  // Reserve: remove each self-identified edition from its title's note pool so an
  // ambiguous sibling can't be handed a value that's already spoken for.
  items.forEach((item, i) => {
    if (results[i] == null) return;
    const bucket = noteData.groups.get(normalizeTitleForGrouping(item.title));
    if (!bucket) return;
    const idx = bucket.indexOf(results[i]);
    if (idx !== -1) bucket.splice(idx, 1);
  });

  // Pass 2 — remaining ambiguous items draw whatever the pool has left, in note order.
  for (const i of pendingIdx) {
    const item = items[i];
    const bucket = noteData.groups.get(normalizeTitleForGrouping(item.title));
    if (bucket && bucket.length > 0) { results[i] = bucket.shift(); continue; }
    if (noteData.singleValue) { results[i] = noteData.singleValue; continue; }
    results[i] = normalizeEditionNum(item.sku);
  }

  return results;
}

// Unused dead code in the original — ported as-is (zero-regression rule), not removed.
export { detectEditionType };
