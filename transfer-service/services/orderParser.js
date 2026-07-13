// Ported verbatim from functions/index.js (post edition-#136 fix). No logic changes.
import { normalizeEditionNum, normalizeTitleForGrouping } from './editionResolver.js';

// Parses one order's note into a per-order, per-title assignment pool.
// Multi-product notes are pipe-delimited, one line per unit, e.g.:
//   "World T20 Champions 2026 Edition|#002\nWorld T20 Champions 2026 Edition|#003\n..."
// Multiple line items can share the EXACT same product title (one order line per unit
// purchased) — a plain "does this note mention my title" check can't tell them apart,
// so editions are pooled per normalized title, in note order, and handed out one at a
// time (FIFO) as line items claim them via resolveOrderEditions(). This Map is built fresh
// for a single order and discarded once that order's line items are processed — it is
// never persisted or shared across orders/customers.
export function parseOrderNoteGroups(orderNote) {
  const groups = new Map(); // normalizedTitle -> string[] of edition numbers, in note order
  let singleValue = null;
  if (!orderNote) return { groups, singleValue };

  let hasPipeLine = false;
  for (const ln of orderNote.split(/[\r\n]+/)) {
    if (!ln.includes('|')) continue;
    hasPipeLine = true;
    const [tp, ep] = ln.split('|');
    const title = normalizeTitleForGrouping(tp);
    const edNum = normalizeEditionNum(ep);
    if (!title || !edNum) continue;
    if (!groups.has(title)) groups.set(title, []);
    groups.get(title).push(edNum);
  }

  // Single-product note (no pipes) — e.g. "Edition #050" as the entire note.
  if (!hasPipeLine) {
    const m = orderNote.match(/edition[\s#:]*(\d+)/i) || orderNote.match(/#(\d+)/i);
    if (m) singleValue = normalizeEditionNum(m[1]);
  }

  return { groups, singleValue };
}
