import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { watch } from 'chokidar';

const STORE   = process.env.SHOPIFY_STORE;
const TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const BASE    = `https://${STORE}/admin/api/${VERSION}`;
const HEADERS = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

// Dev theme — unpublished copy, never the live store
const DEV_THEME_ID = 152614928558;
const PREVIEW_URL  = `https://${STORE}/?preview_theme_id=${DEV_THEME_ID}`;
const THEME_DIR    = join(process.cwd(), 'theme');

const BINARY_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.otf', '.pdf', '.zip']);

let queue = [];
let uploading = false;

async function uploadAsset(key, filePath) {
  let body;
  const ext = '.' + key.split('.').pop().toLowerCase();

  if (BINARY_EXTS.has(ext)) {
    const buf = readFileSync(filePath);
    body = JSON.stringify({ asset: { key, attachment: buf.toString('base64') } });
  } else {
    const value = readFileSync(filePath, 'utf8');
    body = JSON.stringify({ asset: { key, value } });
  }

  const res = await fetch(`${BASE}/themes/${DEV_THEME_ID}/assets.json`, {
    method: 'PUT',
    headers: HEADERS,
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.errors ? JSON.stringify(err.errors) : `HTTP ${res.status}`);
  }
}

async function deleteAsset(key) {
  const res = await fetch(`${BASE}/themes/${DEV_THEME_ID}/assets.json?asset[key]=${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: HEADERS,
  });
  if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
}

function toKey(filePath) {
  return relative(THEME_DIR, filePath).replace(/\\/g, '/');
}

async function processQueue() {
  if (uploading || queue.length === 0) return;
  uploading = true;

  while (queue.length > 0) {
    const { type, key, filePath } = queue.shift();
    const time = new Date().toLocaleTimeString();
    try {
      if (type === 'delete') {
        await deleteAsset(key);
        console.log(`[${time}] deleted  ${key}`);
      } else {
        await uploadAsset(key, filePath);
        console.log(`[${time}] uploaded ${key}`);
      }
    } catch (err) {
      console.error(`[${time}] FAILED   ${key} — ${err.message}`);
    }
    // Respect Shopify rate limit
    await new Promise(r => setTimeout(r, 520));
  }

  uploading = false;
}

function enqueue(type, filePath) {
  if (!existsSync(filePath) && type !== 'delete') return;
  const key = toKey(filePath);
  if (!key || key.startsWith('..')) return;
  // dedupe: remove any existing entry for same key
  queue = queue.filter(q => q.key !== key);
  queue.push({ type, key, filePath });
  processQueue();
}

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║          LEGXI Theme Dev — Local Preview          ║');
console.log('╠══════════════════════════════════════════════════╣');
console.log(`║  Dev theme:  Unpublished copy (safe sandbox)      ║`);
console.log(`║  Live store: NOT affected                         ║`);
console.log('╠══════════════════════════════════════════════════╣');
console.log(`║  Preview URL:                                     ║`);
console.log(`║  ${PREVIEW_URL}`);
console.log('╚══════════════════════════════════════════════════╝');
console.log('\nWatching theme/ for changes...\n');

const watcher = watch(THEME_DIR, {
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
});

watcher
  .on('add',    path => enqueue('upload', path))
  .on('change', path => enqueue('upload', path))
  .on('unlink', path => enqueue('delete', path));

process.on('SIGINT', () => {
  console.log('\nStopping watcher. Live store was never touched.');
  process.exit(0);
});
