import 'dotenv/config';
const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

async function api(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://${STORE}/admin/api/2024-10/${path}`, opts);
  const data = await res.text();
  try { return { status: res.status, data: JSON.parse(data) }; } catch { return { status: res.status, data }; }
}

// Check Google & YouTube Sales Channel (Google Shopping) presence
console.log('=== CHECKING SALES CHANNELS ===');
const channels = await api('webhooks.json?topic=google%2Fproducts%2Fsync');
console.log(`Google sync webhooks: ${JSON.stringify(channels.data).substring(0, 200)}`);

// Check all channels/apps
console.log('\n=== CHECKING ALL WEBHOOK TOPICS ===');
const webhooks = await api(`webhooks.json`);
console.log(`Total webhooks: ${webhooks.data?.webhooks?.length || 0}`);
for (const w of webhooks.data?.webhooks || []) {
  if (w.topic.toLowerCase().includes('google') || w.topic.toLowerCase().includes('shopping')) {
    console.log(`  ${w.topic} -> ${w.address}`);
  }
}

// Check for Google Shopping app via application charges or recurring charges
console.log('\n=== CHECKING GOOGLE SHOPPING APP ===');
const apps = await api('shopify_payments/balance.json');
console.log(`Payments: ${JSON.stringify(apps.data).substring(0, 200)}`);

// Try to find Google Channel info - check for collections that contain "google" in the rules
console.log('\n=== CHECKING SMART COLLECTIONS (potential Google feed configs) ===');
const collections = await api('smart_collections.json?limit=50');
for (const c of collections.data?.smart_collections || []) {
  if (c.title.toLowerCase().includes('google') || c.title.toLowerCase().includes('all products')) {
    console.log(`  ${c.id}: ${c.title}`);
  }
}

// Check for Google & YouTube channel in the store
console.log('\n=== CHECKING FOR CHANNEL INTEGRATIONS ===');
const bulkOps = await api('graphql.json', 'POST', { query: `
  {
    channels(first: 10) {
      edges {
        node {
          id
          name
          handle
        }
      }
    }
  }
`});
console.log(JSON.stringify(bulkOps.data, null, 2).substring(0, 1000));

// Check products in Google Sales Channel via collection
console.log('\n=== CHECKING ALL PRODUCTS COUNT ===');
const count = await api('products/count.json');
console.log(`Total products: ${count.data?.count || 'unknown'}`);

// Check for any Google-related collection that feeds into Merchant Center
console.log('\n=== CHECKING CUSTOM COLLECTIONS ===');
const customColl = await api('custom_collections.json?limit=50');
for (const c of customColl.data?.custom_collections || []) {
  console.log(`  ${c.id}: ${c.title}`);
}
