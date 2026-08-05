import 'dotenv/config';
import fs from 'fs';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';
const REST_URL = `https://${STORE}/admin/api/${VERSION}`;

async function run() {
  const themesData = await fetch(`${REST_URL}/themes.json`, { headers: { 'X-Shopify-Access-Token': TOKEN }}).then(r=>r.json());
  const activeTheme = themesData.themes.find(t => t.role === 'main');
  
  const assetsData = await fetch(`${REST_URL}/themes/${activeTheme.id}/assets.json`, { headers: { 'X-Shopify-Access-Token': TOKEN }}).then(r=>r.json());
  const snippets = assetsData.assets.map(a => a.key).filter(k => k.startsWith('snippets/') || k.startsWith('layout/'));
  
  console.log('Downloading potential meta/SEO snippets...');
  for(const key of snippets) {
    if (key.includes('meta') || key.includes('seo') || key.includes('head')) {
      const assetData = await fetch(`${REST_URL}/themes/${activeTheme.id}/assets.json?asset[key]=${key}`, { headers: { 'X-Shopify-Access-Token': TOKEN }}).then(r=>r.json());
      fs.writeFileSync(key.replace('/', '_'), assetData.asset.value);
      console.log(`Saved ${key}`);
    }
  }
}
run();
