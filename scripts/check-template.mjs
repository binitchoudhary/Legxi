import 'dotenv/config';
const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';
const REST_URL = `https://${STORE}/admin/api/${VERSION}`;

async function run() {
  const page = await fetch(`${REST_URL}/pages/115310756014.json`, { headers: { 'X-Shopify-Access-Token': TOKEN }}).then(r=>r.json());
  console.log('Template suffix:', page.page.template_suffix);
}
run();
