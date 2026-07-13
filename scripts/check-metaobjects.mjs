import 'dotenv/config';

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}`;
const H    = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

const r = await fetch(`${BASE}/graphql.json`, {
  method: 'POST', headers: H,
  body: JSON.stringify({ query: '{ metaobjectDefinitions(first:20) { edges { node { type name } } } }' }),
});
const d = await r.json();
if (d.errors) console.log('Errors:', JSON.stringify(d.errors));
const defs = d?.data?.metaobjectDefinitions?.edges?.map(e => e.node) || [];
console.log('Definitions found:', defs.length);
defs.forEach(def => console.log(' -', def.type, '|', def.name));
