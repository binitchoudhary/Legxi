import 'dotenv/config';
import { writeFileSync } from 'fs';

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/150920200366/assets.json`;
const H = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN };

const r = await fetch(`${BASE}?asset[key]=sections/cart-drawer.liquid`, { headers: H });
const d = await r.json();
if (!d.asset) { console.log('ERR:', JSON.stringify(d)); process.exit(1); }
writeFileSync('theme/sections/cart-drawer.liquid', d.asset.value, 'utf8');
console.log('Fetched — updated_at:', d.asset.updated_at);
