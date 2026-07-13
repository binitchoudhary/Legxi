import 'dotenv/config';
import fs from 'fs';

const THEME_ID = '150920200366';
const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/${THEME_ID}/assets.json`;
const H = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

const res = await fetch(`${BASE}?asset[key]=assets/theme.js`, { headers: H });
const data = await res.json();
if (data.asset && data.asset.value) {
  fs.writeFileSync('theme.js.downloaded', data.asset.value);
  console.log('Saved to theme.js.downloaded');
}
