import 'dotenv/config';
import { writeFileSync } from 'fs';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const LIVE_THEME = 150920200366;
const BASE = `https://${STORE}/admin/api/${VERSION}`;

const res = await fetch(`${BASE}/themes/${LIVE_THEME}/assets.json?asset[key]=templates/product.argentine-icons-24k.json`, {
  headers: { 'X-Shopify-Access-Token': TOKEN }
});
const d = await res.json();
writeFileSync('live-template.json', d.asset.value);
console.log('Saved to live-template.json');
