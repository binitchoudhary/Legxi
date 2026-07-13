import 'dotenv/config';
import { readFileSync } from 'fs';

const STORE   = process.env.SHOPIFY_STORE;
const TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const LIVE    = 150920200366;
const BASE    = `https://${STORE}/admin/api/${VERSION}`;
const HEADERS = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

async function push(key, localFile) {
  const value = readFileSync(localFile, 'utf8');
  const res = await fetch(`${BASE}/themes/${LIVE}/assets.json`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify({ asset: { key, value } }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(`Push failed for ${key}: ${JSON.stringify(d.errors)}`);
  console.log(`✓ ${key}`);
  await new Promise(r => setTimeout(r, 700));
}

console.log('Pushing popup changes to LIVE theme...\n');

await push(
  'templates/product.campeones-world-cup-2022.json',
  'live-templates/updated-product.campeones-world-cup-2022.json'
);
await push(
  'templates/product.la-scaloneta-2026-edition.json',
  'live-templates/updated-product.la-scaloneta-2026-edition.json'
);
await push(
  'templates/product.trinity-set.json',
  'live-templates/updated-product.trinity-set.json'
);

console.log('\nAll changes pushed to live. Pages updated:');
console.log('  https://legxi.co/products/campeones-world-cup-2022-edition');
console.log('  https://legxi.co/products/la-scaloneta-squad-edition');
console.log('  https://legxi.co/products/legxi-champions-trinity-set-1');
