
import 'dotenv/config';
const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;

async function getCount() {
  const res = await fetch('https://' + STORE + '/admin/api/' + VERSION + '/orders/count.json?status=any', {
    headers: { 'X-Shopify-Access-Token': TOKEN }
  });
  const data = await res.json();
  console.log('Total Orders Count:', data);
}
getCount().catch(console.error);

