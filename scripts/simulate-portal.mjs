// Simulates exactly what certificate-authentication.liquid does in the browser

const API = 'https://api-7zal2ngszq-uc.a.run.app';
const phone = process.argv[2] || '+918368853400';

console.log(`\nSimulating auth portal for: ${phone}\n`);

// Step 1: Call /customer-products (same as portal)
const res = await fetch(API + '/customer-products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phoneNumber: phone, ordersFirst: 100, lineItemsFirst: 50 })
});
const data = await res.json();

const customers = data?.customers?.edges || [];
console.log(`Customers returned: ${customers.length}`);

// Step 2: Mirror fetchOrders() logic from the portal
function normalizeEdition(val) {
  if (!val) return null;
  const str = String(val).trim();
  const slashM = str.match(/^(\d+)\s*[/]\s*\d+/);
  if (slashM) return '#' + String(parseInt(slashM[1], 10)).padStart(3, '0');
  const numM = str.match(/#?(\d+)/);
  if (numM) return '#' + String(parseInt(numM[1], 10)).padStart(3, '0');
  return null;
}

function detectEdition(li) {
  const prod = li.product || (li.variant?.product) || {};
  const mf = prod.metafield;
  if (mf?.key === 'edition_type') {
    const mv = (mf.value || '').toLowerCase().trim();
    if (mv === 'artisan') return 'artisan';
    if (mv === 'signed')  return 'signed';
  }
  const all = [
    (li.variant?.selectedOptions || []).map(o => o.name + ' ' + o.value).join(' '),
    li.variant?.title || '',
    li.title || '',
    li.variant?.sku || '',
    (prod.tags || []).join(' '),
    (li.customAttributes || []).map(a => a.key + ' ' + a.value).join(' ')
  ].join(' ').toLowerCase();
  if (/artisan/.test(all)) return 'artisan';
  if (/signed/.test(all))  return 'signed';
  return null;
}

function extractEditionNum(li, orderNote) {
  // 1. Properties/customAttributes
  for (const p of (li.customAttributes || [])) {
    if (/^edition\s*(number)?$/i.test(p.key.trim())) {
      const n = normalizeEdition(p.value); if (n) return n;
    }
  }
  // 2. Variant title
  const vtNum = normalizeEdition(li.variant?.title); if (vtNum) return vtNum;
  // 3. Order note
  if (orderNote) {
    for (const ln of orderNote.split(/[\r\n]+/)) {
      if (ln.includes('|')) {
        const [tp, ep] = ln.split('|');
        if (li.title?.toLowerCase().includes(tp.trim().toLowerCase())) {
          const n = normalizeEdition(ep); if (n) return n;
        }
      }
    }
    const m = orderNote.match(/edition[\s#:]*(\d+)/i) || orderNote.match(/#(\d+)/i);
    if (m) return normalizeEdition(m[1]);
  }
  // 4. SKU
  return normalizeEdition(li.variant?.sku);
}

// Collect ALL orders from ALL customers (post-fix logic)
const seenOrderIds = {};
const validOrders = [];
let displayName = '';

for (const ce of customers) {
  const c = ce.node;
  if (!displayName && (c.firstName || c.lastName)) {
    displayName = ((c.firstName || '') + ' ' + (c.lastName || '')).trim();
  }
  const ordersEdges = c.orders?.edges || [];
  for (const oe of ordersEdges) {
    const order = oe.node;
    if (order.cancelledAt) continue;
    if (seenOrderIds[order.id]) continue;
    const lineItems = order.lineItems?.edges || [];
    if (!lineItems.length) continue;
    const hasEligible = lineItems.some(e => {
      const t = detectEdition(e.node); return t === 'artisan' || t === 'signed';
    });
    if (hasEligible) { seenOrderIds[order.id] = true; validOrders.push(order); }
  }
}

console.log(`Customer display name: "${displayName || 'Valued Collector'}"`);
console.log(`Valid orders (with cert items): ${validOrders.length}`);

// Step 3: Mirror renderProducts() — what cards would be shown
const artisanCards = [];
const signedCards  = [];

for (const order of validOrders) {
  for (const e of (order.lineItems?.edges || [])) {
    const li = e.node;
    const edType = detectEdition(li);
    if (!edType) continue;
    const edNum = extractEditionNum(li, order.note);
    const prod = li.product || li.variant?.product || {};

    const card = {
      title:   li.title,
      edition: edNum || '(no edition number)',
      type:    edType,
      order:   order.name,
      note:    order.note ? order.note.slice(0, 60) : null,
      variantTitle: li.variant?.title,
      sku:     li.variant?.sku,
    };
    if (edType === 'artisan') artisanCards.push(card);
    else                      signedCards.push(card);
  }
}

console.log(`\n── ARTISAN SCREEN (${artisanCards.length} cards) ──`);
artisanCards.forEach((c, i) => {
  console.log(`  ${i+1}. "${c.title}"`);
  console.log(`     Edition: ${c.edition} | Order: ${c.order}`);
  if (c.variantTitle) console.log(`     Variant: ${c.variantTitle}`);
});

console.log(`\n── SIGNED SCREEN (${signedCards.length} cards) ──`);
signedCards.forEach((c, i) => {
  console.log(`  ${i+1}. "${c.title}"`);
  console.log(`     Edition: ${c.edition} | Order: ${c.order}`);
  if (c.variantTitle) console.log(`     Variant: ${c.variantTitle}`);
});

console.log(`\nTOTAL VISIBLE: ${artisanCards.length + signedCards.length} product cards`);
