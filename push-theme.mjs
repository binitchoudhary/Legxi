import 'dotenv/config';
import { readFileSync } from 'fs';

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/150920200366/assets.json`;
const H = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

// Step 1: fetch live theme.liquid
const liveRes = await fetch(`${BASE}?asset[key]=layout/theme.liquid`, { headers: H });
const liveData = await liveRes.json();
if (!liveData.asset) { console.log('ERR fetching live:', JSON.stringify(liveData)); process.exit(1); }
console.log('Fetched live theme.liquid — updated_at:', liveData.asset.updated_at);

// Step 2: read our local updated file
const localContent = readFileSync('theme/fetched-layout-theme.liquid', 'utf8');

// Step 3: push
const pushRes = await fetch(BASE, {
  method: 'PUT',
  headers: H,
  body: JSON.stringify({ asset: { key: 'layout/theme.liquid', value: localContent } })
});
const pushData = await pushRes.json();
if (pushData.asset) {
  console.log('✓ LIVE  layout/theme.liquid — updated_at:', pushData.asset.updated_at);
} else {
  console.log('ERR pushing:', JSON.stringify(pushData.errors || pushData));
}
