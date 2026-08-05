import 'dotenv/config';
import fs from 'fs';
const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';
const REST_URL = `https://${STORE}/admin/api/${VERSION}`;

async function run() {
  const themesData = await fetch(`${REST_URL}/themes.json`, { headers: { 'X-Shopify-Access-Token': TOKEN }}).then(r=>r.json());
  const activeTheme = themesData.themes.find(t => t.role === 'main');
  
  let assetData = await fetch(`${REST_URL}/themes/${activeTheme.id}/assets.json?asset[key]=templates/page.career.json`, { headers: { 'X-Shopify-Access-Token': TOKEN }}).then(r=>r.json());
  if (assetData.errors) {
      assetData = await fetch(`${REST_URL}/themes/${activeTheme.id}/assets.json?asset[key]=templates/page.career.liquid`, { headers: { 'X-Shopify-Access-Token': TOKEN }}).then(r=>r.json());
  }
  
  fs.writeFileSync('page_career.json', JSON.stringify(assetData, null, 2));
}
run();
