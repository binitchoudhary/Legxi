import 'dotenv/config';

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}`;
const H    = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

// List products with "2007" in title to see real handles
const r = await fetch(`${BASE}/graphql.json`, {
  method: 'POST', headers: H,
  body: JSON.stringify({
    query: `{ products(first:10, query:"2007") { edges { node { handle title } } } }`,
  }),
});
const d = await r.json();
const nodes = d?.data?.products?.edges?.map(e=>e.node) || [];
console.log('Products with "2007":');
nodes.forEach(n => console.log(`  handle: "${n.handle}"  title: "${n.title}"`));

// Also try keyword search
const r2 = await fetch(`${BASE}/graphql.json`, {
  method: 'POST', headers: H,
  body: JSON.stringify({
    query: `{ products(first:5, query:"T20 Era") { edges { node { handle title featuredImage { url } description } } } }`,
  }),
});
const d2 = await r2.json();
const nodes2 = d2?.data?.products?.edges?.map(e=>e.node) || [];
console.log('\nProducts with "T20 Era":');
nodes2.forEach(n => console.log(`  handle: "${n.handle}" | img:${!!n.featuredImage?.url} | desc:${!!n.description}`));
