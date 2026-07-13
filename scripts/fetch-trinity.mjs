import 'dotenv/config';
import { writeFileSync } from 'fs';

const STORE   = process.env.SHOPIFY_STORE;
const TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const LIVE    = 150920200366;
const BASE    = `https://${STORE}/admin/api/${VERSION}`;
const HEADERS = { 'X-Shopify-Access-Token': TOKEN };

const key = 'templates/product.trinity-set.json';
const r = await fetch(`${BASE}/themes/${LIVE}/assets.json?asset[key]=${encodeURIComponent(key)}`, { headers: HEADERS });
const d = await r.json();
writeFileSync('live-templates/product.trinity-set.json', d.asset.value);
console.log(d.asset.value);
