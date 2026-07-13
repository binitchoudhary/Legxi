import 'dotenv/config';
const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

async function rest(path) {
  const res = await fetch(`https://${STORE}/admin/api/2024-10/${path}`, {
    headers: { 'X-Shopify-Access-Token': TOKEN }
  });
  const text = await res.text();
  try { return { status: res.status, json: JSON.parse(text) }; } catch { return { status: res.status, text }; }
}

// Check the Google channel handle and try to access its listing
console.log('=== 1. GOOGLE SALES CHANNEL LISTINGS (via product_listings) ===');
// product_listings endpoint is for the sales channel
const listings = await rest('product_listings.json?limit=10');
console.log(`Product listings: ${JSON.stringify(listings.json).substring(0, 500)}`);

// Check collection that might be used for Google feed
console.log('\n=== 2. CHECKING ALL COLLECTIONS ===');
const colls = await rest('custom_collections.json?limit=50');
if (colls.json?.custom_collections) {
  for (const c of colls.json.custom_collections) {
    console.log(`  ${c.id}: ${c.title} (${c.published ? 'published' : 'unpublished'})`);
  }
}
const scolls = await rest('smart_collections.json?limit=50');
if (scolls.json?.smart_collections) {
  for (const c of scolls.json.smart_collections) {
    console.log(`  ${c.id}: ${c.title} (${c.published ? 'published' : 'unpublished'})`);
  }
}

// Check all product listings count
console.log('\n=== 3. TOTAL PRODUCT LISTINGS ===');
const count = await rest('product_listings/count.json');
console.log(`Count: ${JSON.stringify(count.json)}`);

// Check product feed sync by looking at the GraphQL schema for productFeedSync
console.log('\n=== 4. CHECKING SHOPIFY GRAPHQL SCHEMA FOR PRODUCT FEED ===');
const schemaQuery = `
  {
    __schema {
      types {
        name
        fields {
          name
        }
      }
    }
  }
`;
const res = await fetch(`https://${STORE}/admin/api/2024-10/graphql.json`, {
  method: 'POST',
  headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: schemaQuery })
});
const schemaData = await res.json();
// Find ProductFeed related types
const allTypes = schemaData.data?.__schema?.types || [];
const feedTypes = allTypes.filter(t => t.name.includes('ProductFeed') || t.name.includes('Google') || t.name.includes('Merchant') || t.name.includes('Channel') || t.name.includes('Publication'));
for (const t of feedTypes) {
  const fieldNames = t.fields?.map(f => f.name).join(', ') || 'no fields';
  console.log(`  ${t.name}: ${fieldNames.substring(0, 200)}`);
}
