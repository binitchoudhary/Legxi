import 'dotenv/config';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const BASE = `https://${STORE}/admin/api/${VERSION}`;
const HEADERS = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

// Find products with "Demo" in the title
const res = await fetch(`${BASE}/products.json?title=Demo&limit=10`, { headers: HEADERS });
const data = await res.json();

const demoProducts = data.products || [];
console.log(`Found ${demoProducts.length} product(s) matching "Demo":`);
demoProducts.forEach(p => console.log(`  ID: ${p.id} | Title: "${p.title}" | Status: ${p.status}`));

if (demoProducts.length === 0) {
  console.log('No Demo products found.');
  process.exit(0);
}

for (const product of demoProducts) {
  if (product.status !== 'draft') {
    const updateRes = await fetch(`${BASE}/products/${product.id}.json`, {
      method: 'PUT',
      headers: HEADERS,
      body: JSON.stringify({ product: { id: product.id, status: 'draft' } }),
    });
    const result = await updateRes.json();
    if (updateRes.ok) {
      console.log(`✓ Unpublished: "${product.title}" (ID: ${product.id}) → status: draft`);
    } else {
      console.log(`✗ Failed to unpublish "${product.title}": ${JSON.stringify(result.errors)}`);
    }
  } else {
    console.log(`→ Already draft: "${product.title}" (ID: ${product.id})`);
  }
}
