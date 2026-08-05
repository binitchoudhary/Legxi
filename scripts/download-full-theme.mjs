import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';
const REST_URL = `https://${STORE}/admin/api/${VERSION}`;

async function run() {
  const themesData = await fetch(`${REST_URL}/themes.json`, { headers: { 'X-Shopify-Access-Token': TOKEN }}).then(r=>r.json());
  const activeTheme = themesData.themes.find(t => t.role === 'main');
  
  const assetsData = await fetch(`${REST_URL}/themes/${activeTheme.id}/assets.json`, { headers: { 'X-Shopify-Access-Token': TOKEN }}).then(r=>r.json());
  const liquidAssets = assetsData.assets.filter(a => a.key.endsWith('.liquid') || a.key.endsWith('.json'));
  
  fs.mkdirSync('live_theme_dump', { recursive: true });
  
  console.log(`Downloading ${liquidAssets.length} assets...`);
  
  for(const asset of liquidAssets) {
    try {
      const data = await fetch(`${REST_URL}/themes/${activeTheme.id}/assets.json?asset[key]=${asset.key}`, { headers: { 'X-Shopify-Access-Token': TOKEN }}).then(r=>r.json());
      if (data.asset && data.asset.value) {
          const target = path.join('live_theme_dump', asset.key.replace(/\//g, '_'));
          fs.writeFileSync(target, data.asset.value);
      }
    } catch(e) {}
  }
  console.log('Done.');
}
run();
