import 'dotenv/config';
import { readFileSync } from 'fs';

const STORE   = process.env.SHOPIFY_STORE;
const TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const LIVE    = 150920200366;
const BASE    = `https://${STORE}/admin/api/${VERSION}`;
const HEADERS = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

const files = [
  { key: 'snippets/product-info.liquid', path: 'theme/live/snippets/product-info.liquid' },
];

console.log('\nPushing to LIVE theme...\n');
for (const f of files) {
  const value = readFileSync(f.path, 'utf8');
  const res = await fetch(`${BASE}/themes/${LIVE}/assets.json`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify({ asset: { key: f.key, value } }),
  });
  const d = await res.json();
  console.log(res.ok ? `✓ ${f.key}` : `✗ ${f.key}: ${JSON.stringify(d.errors)}`);
}
console.log('\nDone.');
