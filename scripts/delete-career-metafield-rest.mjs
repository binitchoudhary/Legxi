import 'dotenv/config';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';
const REST_URL = `https://${STORE}/admin/api/${VERSION}`;

async function run() {
  const mfs = await fetch(`${REST_URL}/pages/115310756014/metafields.json`, { headers: { 'X-Shopify-Access-Token': TOKEN }}).then(r=>r.json());
  console.log('Current metafields:', mfs);
  
  if (mfs.metafields) {
    const hidden = mfs.metafields.find(m => m.namespace === 'seo' && m.key === 'hidden');
    if (hidden) {
      console.log('Deleting metafield ID', hidden.id);
      const res = await fetch(`${REST_URL}/pages/115310756014/metafields/${hidden.id}.json`, { method: 'DELETE', headers: { 'X-Shopify-Access-Token': TOKEN }});
      console.log('Delete status:', res.status);
    }
  }
}
run();
