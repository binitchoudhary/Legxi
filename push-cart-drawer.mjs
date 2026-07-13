import 'dotenv/config';
import { readFileSync } from 'fs';

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/150920200366/assets.json`;
const H = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

const content = readFileSync('theme/sections/cart-drawer.liquid', 'utf8');
const r = await fetch(BASE, {
  method: 'PUT',
  headers: H,
  body: JSON.stringify({ asset: { key: 'sections/cart-drawer.liquid', value: content } })
});
const d = await r.json();
if (d.asset) {
  console.log('✓ LIVE  sections/cart-drawer.liquid — updated_at:', d.asset.updated_at);
} else {
  console.log('ERR:', JSON.stringify(d.errors || d));
}
