import 'dotenv/config';

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}`;
const H    = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

const q = `query($q:String!,$of:Int!,$lf:Int!) {
  customers(first:3, query:$q) {
    edges { node {
      id firstName lastName email phone
      orders(first:$of, sortKey:CREATED_AT, reverse:true) {
        edges { node {
          id name note email createdAt processedAt cancelledAt
          lineItems(first:$lf) {
            edges { node {
              title quantity
              customAttributes { key value }
              variant {
                id title sku
                image { url altText }
                selectedOptions { name value }
                product {
                  id handle title tags description
                  featuredImage { url altText }
                  metafield(namespace:"custom", key:"edition_type") { key value }
                }
              }
            }}
          }
        }}
      }
    }}
  }
}`;

const res = await fetch(`${BASE}/graphql.json`, {
  method: 'POST', headers: H,
  body: JSON.stringify({ query: q, variables: { q: 'phone:+918368853400', of: 20, lf: 20 } }),
});
const d = await res.json();

if (d.errors) { console.log('GQL ERRORS:', JSON.stringify(d.errors, null, 2)); process.exit(1); }

const customers = d.data?.customers?.edges || [];
console.log('customers:', customers.length);

const orders = customers[0]?.node?.orders?.edges || [];
console.log('orders:', orders.length);

for (const oe of orders) {
  const o = oe.node;
  if (o.cancelledAt) continue;
  const li0 = o.lineItems?.edges?.[0]?.node;
  if (!li0) continue;
  const prod = li0.variant?.product;
  if (!prod?.metafield) continue;
  console.log(`\nOrder ${o.name} — processedAt: ${o.processedAt || o.createdAt}`);
  console.log(`  Item: "${li0.title}"`);
  console.log(`  description: "${(prod.description || '').slice(0, 80)}"`);
  console.log(`  featuredImage: ${prod.featuredImage?.url ? 'YES — ' + prod.featuredImage.url.slice(0, 60) : 'NO'}`);
  console.log(`  variant.image: ${li0.variant?.image?.url ? 'YES' : 'NO'}`);
}
