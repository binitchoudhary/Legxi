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

// 1. Update a product's metafield to trigger Google sync (benign change)
// First, check what product update mutations are available
console.log('=== CHECKING TRIGGER OPTIONS ===');

// Check the existing webhook subscriptions
console.log('\n1. Webhook subscriptions:');
const webhooks = await rest('webhooks.json');
if (webhooks.json?.webhooks) {
  for (const w of webhooks.json.webhooks) {
    console.log(`  ${w.id}: ${w.topic} -> ${w.address}`);
  }
} else {
  console.log(`  ${JSON.stringify(webhooks.json).substring(0, 200)}`);
}

// Check if Google Content API Shopping is accessible
// The Google Content API for Shopping v2.1 is at:
// https://shoppingcontent.googleapis.com/content/v2.1/{merchantId}/products
// We don't have the merchantId or OAuth credentials

// But let's check if there's a Shopify GraphQL mutation to force sync
console.log('\n2. Checking GraphQL mutations for product feed:');
const gqlRes = await fetch(`https://${STORE}/admin/api/2024-10/graphql.json`, {
  method: 'POST',
  headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `{ __schema { mutationType { fields { name args { name type { name } } } } } }`
  })
});
const gqlData = await gqlRes.json();
const mutations = gqlData.data?.__schema?.mutationType?.fields || [];
const shoppingMutations = mutations.filter(m => 
  m.name.toLowerCase().includes('feed') || 
  m.name.toLowerCase().includes('publication') || 
  m.name.toLowerCase().includes('publish')
);
console.log('Shopping-related mutations:');
for (const m of shoppingMutations) {
  console.log(`  ${m.name}`);
}

// Let's try to trigger a product update to cause Google re-sync
// A safe update: change the product's metafield or SEO title (benign)
// But first, let's see what the product looks like
console.log('\n3. Current product handles for reference:');
const products = await rest('products.json?limit=5&fields=id,title,handle');
if (products.json?.products) {
  for (const p of products.json.products) {
    console.log(`  ${p.id}: ${p.title} -> /products/${p.handle}`);
  }
}

// Check if we have "Google Shopping" specific metafields
console.log('\n4. Checking Google Shopping metafields on products:');
const prodWithMeta = await rest('products/9143560437934/metafields.json');
// Metafields for product Argentine Icons
console.log(`Metafields: ${JSON.stringify(prodWithMeta.json).substring(0, 500)}`);
