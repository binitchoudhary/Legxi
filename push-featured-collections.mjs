import 'dotenv/config';
import { readFileSync } from 'fs';

const THEME_ID = '150920200366';
const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/${THEME_ID}/assets.json`;
const H = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

const ASSET_KEY = 'sections/featured-collections.liquid';
const LOCAL_FILE = 'theme/sections/featured-collections.liquid';

const localContent = readFileSync(LOCAL_FILE, 'utf8');
console.log(`Pushing ${ASSET_KEY} to live theme ${THEME_ID}...`);

const res = await fetch(BASE, {
  method: 'PUT',
  headers: H,
  body: JSON.stringify({ asset: { key: ASSET_KEY, value: localContent } })
});
const data = await res.json();

if (data.asset) {
  console.log('✓ SUCCESS — updated_at:', data.asset.updated_at);
} else {
  console.log('ERR:', JSON.stringify(data.errors || data));
  process.exit(1);
}
