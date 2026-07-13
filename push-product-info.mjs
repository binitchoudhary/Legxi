import 'dotenv/config';
import { readFileSync } from 'fs';

const THEME_ID = '150920200366';
const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/${THEME_ID}/assets.json`;
const H = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

// Read local product-info.liquid
const localContent = readFileSync('theme/live/snippets/product-info.liquid', 'utf8');
console.log('Read local product-info.liquid — length:', localContent.length);

// Push to Shopify
const pushRes = await fetch(BASE, {
  method: 'PUT',
  headers: H,
  body: JSON.stringify({ asset: { key: 'snippets/product-info.liquid', value: localContent } })
});
const pushData = await pushRes.json();
if (pushData.asset) {
  console.log('✓ Pushed snippets/product-info.liquid — updated_at:', pushData.asset.updated_at);
} else {
  console.log('ERR pushing:', JSON.stringify(pushData.errors || pushData));
}
