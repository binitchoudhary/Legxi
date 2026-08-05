import 'dotenv/config';
import fs from 'fs';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';
const H = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

const THEME_ID = '150920200366'; // Current live theme
const BASE = `https://${STORE}/admin/api/${API_VERSION}/themes/${THEME_ID}/assets.json`;

async function pushAsset(key, localPath) {
  console.log(`Pushing ${localPath} -> ${key}...`);
  const value = fs.readFileSync(localPath, 'utf8');
  
  const res = await fetch(BASE, {
    method: 'PUT',
    headers: H,
    body: JSON.stringify({ asset: { key, value } })
  });
  const data = await res.json();
  if (data.asset) {
    console.log(`[SUCCESS] Updated ${key} on theme ${THEME_ID}`);
  } else {
    console.error(`[ERROR] Failed to push ${key}:`, JSON.stringify(data.errors));
  }
}

async function main() {
  await pushAsset('layout/theme.liquid', 'theme/layout/theme.liquid');
  await pushAsset('templates/robots.txt.liquid', 'theme/templates/robots.txt.liquid');
}
main();
