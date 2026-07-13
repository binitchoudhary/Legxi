import 'dotenv/config';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const STORE        = process.env.SHOPIFY_STORE;
const TOKEN        = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION      = process.env.SHOPIFY_API_VERSION;
const BASE         = `https://${STORE}/admin/api/${VERSION}`;
const HEADERS      = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };
const DEV_THEME_ID = 152614928558;
const THEME_DIR    = join(process.cwd(), 'theme');

const BINARY_EXTS = new Set(['.png','.jpg','.jpeg','.gif','.webp','.ico','.woff','.woff2','.ttf','.eot','.otf','.pdf','.zip']);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

async function uploadAsset(key, filePath) {
  const ext = '.' + key.split('.').pop().toLowerCase();
  let body;
  if (BINARY_EXTS.has(ext)) {
    body = JSON.stringify({ asset: { key, attachment: readFileSync(filePath).toString('base64') } });
  } else {
    body = JSON.stringify({ asset: { key, value: readFileSync(filePath, 'utf8') } });
  }
  const res = await fetch(`${BASE}/themes/${DEV_THEME_ID}/assets.json`, {
    method: 'PUT', headers: HEADERS, body,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

async function run() {
  const files = walk(THEME_DIR);
  console.log(`\nSyncing ${files.length} files to dev theme...\n`);
  let done = 0;
  for (const file of files) {
    const key = relative(THEME_DIR, file).replace(/\\/g, '/');
    try {
      await uploadAsset(key, file);
      done++;
      process.stdout.write(`\r[${done}/${files.length}] ${key.padEnd(55)}`);
    } catch (e) {
      console.error(`\n✗ ${key}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 520));
  }
  console.log(`\n\nSync complete! Dev theme is ready.\nPreview: https://${STORE}/?preview_theme_id=${DEV_THEME_ID}\n`);
}

run();
