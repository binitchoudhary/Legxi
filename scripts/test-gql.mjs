import 'dotenv/config';

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}`;
const H    = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

const testPhone = process.argv[2] || '+919311114191';

const q = `query($q:String!,$of:Int!,$lf:Int!) {
  customers(first:5, query:$q) {
    edges { node {
      id firstName lastName email phone
      orders(first:$of, sortKey:CREATED_AT, reverse:true) {
        edges { node {
          id name note
          lineItems(first:$lf) {
            edges { node {
              title quantity
              customAttributes { key value }
              variant {
                id title sku
                selectedOptions { name value }
                product {
                  id handle title tags
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
  body: JSON.stringify({ query: q, variables: { q: `phone:${testPhone}`, of: 10, lf: 20 } }),
});
const d = await res.json();

if (d.errors) { console.log('GQL ERRORS:', JSON.stringify(d.errors, null, 2)); process.exit(1); }

const customers = d.data?.customers?.edges || [];
console.log(`\nPhone: ${testPhone}`);
console.log(`Customers found: ${customers.length}\n`);

customers.forEach(ce => {
  const c = ce.node;
  console.log(`Customer: ${c.firstName} ${c.lastName} | ${c.phone}`);
  const orders = c.orders?.edges || [];
  console.log(`Orders: ${orders.length}`);
  orders.forEach(oe => {
    const o = oe.node;
    console.log(`  Order: ${o.name}`);
    const items = o.lineItems?.edges || [];
    items.forEach(le => {
      const li = le.node;
      const meta = li.variant?.product?.metafield;
      const tags = li.variant?.product?.tags || [];
      console.log(`    Item: "${li.title}"`);
      console.log(`      variant.title: "${li.variant?.title}" | sku: "${li.variant?.sku}"`);
      console.log(`      metafield edition_type: ${meta ? '"' + meta.value + '"' : 'NOT SET'}`);
      console.log(`      tags: [${tags.join(', ')}]`);
    });
  });
});
