import 'dotenv/config';
import { readFileSync } from 'fs';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const DEV = 152614928558;
const BASE = `https://${STORE}/admin/api/${VERSION}`;
const HEADERS = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

const files = [
  { key: 'sections/specialist-form-popup.liquid', path: 'theme/sections/specialist-form-popup.liquid' },
  { key: 'templates/product.argentine-icons-24k.json', path: 'theme/templates/product.argentine-icons-24k.json' },
];

for (const f of files) {
  const value = readFileSync(f.path, 'utf8');
  const res = await fetch(`${BASE}/themes/${DEV}/assets.json`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify({ asset: { key: f.key, value } }),
  });
  const d = await res.json();
  console.log(res.ok ? `✓ ${f.key}` : `✗ ${f.key}: ${JSON.stringify(d.errors)}`);
  await new Promise(r => setTimeout(r, 600));
}
