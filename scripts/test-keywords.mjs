import 'dotenv/config';

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}`;
const H    = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

const title = "2007 : The Birth of India's T20 Era";
const keywords = title.replace(/[^a-z0-9 ]/gi, ' ').trim()
  .split(/\s+/).filter(w => w.length > 2).slice(0, 4).join(' ');
console.log('Keywords:', keywords);

const r = await fetch(`${BASE}/graphql.json`, {
  method: 'POST', headers: H,
  body: JSON.stringify({
    query: `query($q:String!) { products(first:1, query:$q) { edges { node { title description featuredImage { url } } } } }`,
    variables: { q: keywords }
  }),
});
const d = await r.json();
const n = d?.data?.products?.edges?.[0]?.node;
if (!n) { console.log('Not found'); process.exit(1); }
console.log('Found:', n.title);
console.log('Image:', n.featuredImage?.url ? 'YES' : 'NO');
console.log('Desc: ', n.description ? `YES (${n.description.length} chars)` : 'NO');
