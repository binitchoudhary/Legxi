import 'dotenv/config';
import { readFileSync } from 'fs';

const THEME_ID = '150920200366'; // from push-theme.mjs
const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/${THEME_ID}/assets.json`;
const H = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

const localContent = readFileSync('theme/templates/robots.txt.liquid', 'utf8');

const pushRes = await fetch(BASE, {
  method: 'PUT',
  headers: H,
  body: JSON.stringify({ asset: { key: 'templates/robots.txt.liquid', value: localContent } })
});
const pushData = await pushRes.json();

if (pushData.asset) {
  console.log('✓ Pushed templates/robots.txt.liquid — updated_at:', pushData.asset.updated_at);
} else {
  console.log('ERR pushing:', JSON.stringify(pushData.errors || pushData));
}
