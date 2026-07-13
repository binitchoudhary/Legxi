import 'dotenv/config';

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}`;
const H    = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

const handle = 'cert-2007-the-birth-of-india-s-t20-era-010';

// Test 1: lookup by handle (singular)
const r1 = await fetch(`${BASE}/graphql.json`, {
  method: 'POST', headers: H,
  body: JSON.stringify({
    query: `query G($h:String!) { metaobject(handle:{handle:$h,type:"certificate_ownership"}) { id handle fields { key value } } }`,
    variables: { h: handle }
  }),
});
const d1 = await r1.json();
console.log('Singular lookup:', JSON.stringify(d1?.data?.metaobject || d1?.errors));

// Test 2: list all
const r2 = await fetch(`${BASE}/graphql.json`, {
  method: 'POST', headers: H,
  body: JSON.stringify({ query: `{ metaobjects(type:"certificate_ownership", first:10) { edges { node { id handle } } } }` }),
});
const d2 = await r2.json();
const nodes = d2?.data?.metaobjects?.edges?.map(e => e.node) || [];
console.log('List all handles:', nodes.map(n => n.handle));

// Test 3: lookup by ID if we have it
if (nodes.length > 0) {
  const id = nodes[0].id;
  const r3 = await fetch(`${BASE}/graphql.json`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ query: `query($id:ID!) { metaobject(id:$id) { id handle } }`, variables: { id } }),
  });
  const d3 = await r3.json();
  console.log('Lookup by ID:', JSON.stringify(d3?.data?.metaobject));
}
