import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const BASE = `https://${STORE}/admin/api/${VERSION}`;
const HEADERS = { 'X-Shopify-Access-Token': TOKEN };

async function api(path) {
  const res = await fetch(`${BASE}${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function getActiveThemeId() {
  const { themes } = await api('/themes.json');
  const live = themes.find(t => t.role === 'main');
  if (!live) throw new Error('No live theme found');
  console.log(`Live theme: "${live.name}" (ID: ${live.id})\n`);
  return live;
}

async function getAllAssets(themeId) {
  const { assets } = await api(`/themes/${themeId}/assets.json`);
  return assets;
}

async function downloadAsset(themeId, key) {
  const { asset } = await api(`/themes/${themeId}/assets.json?asset[key]=${encodeURIComponent(key)}`);
  return asset;
}

async function run() {
  const themeArg = process.argv[2];
  let themeId, themeName;

  if (themeArg) {
    themeId = themeArg;
    themeName = `theme-${themeArg}`;
  } else {
    const live = await getActiveThemeId();
    themeId = live.id;
    themeName = live.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  }

  const OUT = join(process.cwd(), 'theme');
  mkdirSync(OUT, { recursive: true });

  const assets = await getAllAssets(themeId);
  console.log(`Found ${assets.length} files. Downloading...\n`);

  let done = 0;
  let failed = [];

  for (const asset of assets) {
    try {
      const full = await downloadAsset(themeId, asset.key);
      const filePath = join(OUT, full.key);
      mkdirSync(dirname(filePath), { recursive: true });

      if (full.value !== undefined) {
        writeFileSync(filePath, full.value, 'utf8');
      } else if (full.attachment) {
        writeFileSync(filePath, Buffer.from(full.attachment, 'base64'));
      } else {
        failed.push(asset.key + ' (no content)');
        continue;
      }

      done++;
      process.stdout.write(`\r[${done}/${assets.length}] ${asset.key.padEnd(60)}`);

      // Shopify rate limit: 2 req/sec for theme assets
      await new Promise(r => setTimeout(r, 520));
    } catch (err) {
      failed.push(`${asset.key}: ${err.message}`);
    }
  }

  console.log(`\n\nDone! ${done} files saved to /theme folder.`);
  if (failed.length) {
    console.log(`\nFailed (${failed.length}):`);
    failed.forEach(f => console.log('  ✗', f));
  }
}

run();
