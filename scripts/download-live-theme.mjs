import 'dotenv/config';
import fs from 'fs';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';
const REST_URL = `https://${STORE}/admin/api/${VERSION}`;

async function run() {
  const themesData = await fetch(`${REST_URL}/themes.json`, { headers: { 'X-Shopify-Access-Token': TOKEN }}).then(r=>r.json());
  const activeTheme = themesData.themes.find(t => t.role === 'main');
  console.log('Active theme:', activeTheme.name);
  
  const assetData = await fetch(`${REST_URL}/themes/${activeTheme.id}/assets.json?asset[key]=layout/theme.liquid`, { headers: { 'X-Shopify-Access-Token': TOKEN }}).then(r=>r.json());
  fs.writeFileSync('theme_liquid_live.liquid', assetData.asset.value);
  console.log('Saved live theme.liquid to theme_liquid_live.liquid');
}
run();
