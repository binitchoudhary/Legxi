import 'dotenv/config';

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}`;
const H    = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

const phone10 = p => (p || '').replace(/\D/g, '').slice(-10);
const BINIT_PHONE = '+918368853400';
const BINIT_P10   = phone10(BINIT_PHONE); // 8368853400

// 1. What does /transfer/lookup return for Binit?
// Simulate: getCertsByPhone + transferredCertIds

// Get all ownership records
const r1 = await fetch(`${BASE}/graphql.json`, {
  method: 'POST', headers: H,
  body: JSON.stringify({ query: `{ metaobjects(type:"certificate_ownership", first:50) { edges { node { handle fields { key value } } } } }` }),
});
const d1 = await r1.json();
const allRecords = (d1?.data?.metaobjects?.edges || []).map(e => {
  const f = {};
  e.node.fields.forEach(x => f[x.key] = x.value);
  return { handle: e.node.handle, ...f };
});

console.log('=== ALL REGISTRY RECORDS ===');
allRecords.forEach(r => {
  console.log(`  ${r.certificate_id} | status:${r.transfer_status} | orig:${phone10(r.original_owner_phone)} | curr:${phone10(r.current_owner_phone)}`);
});

// Certs Binit currently owns (current_owner = Binit)
const binitOwns = allRecords.filter(r =>
  phone10(r.current_owner_phone) === BINIT_P10 && r.transfer_status !== 'rejected'
);
console.log(`\n=== BINIT CURRENTLY OWNS (registry) ===`);
console.log(`Count: ${binitOwns.length}`);
binitOwns.forEach(r => console.log(`  ${r.certificate_id}`));

// Certs transferred AWAY from Binit
const transferredAway = allRecords.filter(r =>
  phone10(r.original_owner_phone) === BINIT_P10 &&
  phone10(r.current_owner_phone)  !== BINIT_P10 &&
  r.transfer_status === 'approved'
);
console.log(`\n=== TRANSFERRED AWAY FROM BINIT (will be hidden) ===`);
console.log(`Count: ${transferredAway.length}`);
transferredAway.forEach(r => console.log(`  cert_id: ${r.certificate_id}`));

// 2. How many Shopify orders does Binit have with artisan/signed products?
const q = `query($q:String!,$of:Int!,$lf:Int!) {
  customers(first:3, query:$q) {
    edges { node {
      firstName lastName email phone
      orders(first:$of, sortKey:CREATED_AT, reverse:true) {
        edges { node {
          id name cancelledAt
          lineItems(first:$lf) {
            edges { node {
              title
              variant { product {
                title
                metafield(namespace:"custom", key:"edition_type") { key value }
              }}
            }}
          }
        }}
      }
    }}
  }
}`;

const r2 = await fetch(`${BASE}/graphql.json`, {
  method: 'POST', headers: H,
  body: JSON.stringify({ query: q, variables: { q: `phone:${BINIT_PHONE}`, of: 20, lf: 20 } }),
});
const d2 = await r2.json();
const customers = d2?.data?.customers?.edges || [];
console.log(`\n=== BINIT'S SHOPIFY ORDERS (eligible products) ===`);
const seenOrders = new Set();
let totalEligible = 0;
for (const ce of customers) {
  for (const oe of (ce.node.orders?.edges || [])) {
    const o = oe.node;
    if (o.cancelledAt || seenOrders.has(o.id)) continue;
    seenOrders.add(o.id);
    const items = (o.lineItems?.edges || []).filter(le => {
      const mf = le.node.variant?.product?.metafield;
      return mf?.key === 'edition_type' && (mf.value === 'artisan' || mf.value === 'signed');
    });
    if (!items.length) continue;
    totalEligible += items.length;
    console.log(`  Order ${o.name}:`);
    items.forEach(le => console.log(`    - "${le.node.title}" (${le.node.variant?.product?.metafield?.value})`));
  }
}
console.log(`Total eligible items from Shopify: ${totalEligible}`);
console.log(`\nExpected visible after filter: ${totalEligible - transferredAway.length}`);
