import 'dotenv/config';
import { writeFileSync } from 'fs';

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/150920200366/assets.json`;
const HEADERS = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN };

const listRes = await fetch(BASE, { headers: HEADERS });
const listData = await listRes.json();
const found = listData.assets.filter(a => a.key.toLowerCase().includes('robot') || a.key === 'layout/theme.liquid');
console.log('Found:', found.map(a => a.key));
