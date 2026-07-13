/**
 * Reverts the argentine-icons-24k product page to its original state.
 * Run: node scripts/revert-live.mjs
 */
import 'dotenv/config';
import { readFileSync } from 'fs';

const STORE   = process.env.SHOPIFY_STORE;
const TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const LIVE    = 150920200366;
const BASE    = `https://${STORE}/admin/api/${VERSION}`;
const HEADERS = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

async function put(key, value) {
  const res = await fetch(`${BASE}/themes/${LIVE}/assets.json`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify({ asset: { key, value } }),
  });
  const d = await res.json();
  console.log(res.ok ? `✓ restored: ${key}` : `✗ failed: ${key} — ${JSON.stringify(d.errors)}`);
}

async function del(key) {
  const res = await fetch(`${BASE}/themes/${LIVE}/assets.json?asset[key]=${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: HEADERS,
  });
  console.log(res.ok || res.status === 404 ? `✓ deleted: ${key}` : `✗ failed to delete: ${key}`);
}

console.log('\nReverting live theme to original state...\n');

// 1. Restore original template
const original = readFileSync('backups/product.argentine-icons-24k.ORIGINAL.json', 'utf8');
await put('templates/product.argentine-icons-24k.json', original);
await new Promise(r => setTimeout(r, 600));

// 2. Delete the popup section
await del('sections/specialist-form-popup.liquid');

console.log('\nRevert complete. Live store restored to original.');
