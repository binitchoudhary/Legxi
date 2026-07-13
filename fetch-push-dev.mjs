import 'dotenv/config';
import { writeFileSync, readFileSync } from 'fs';

// "Dev theme" — corrected 2026-07-10, was pointing at the stale 152614928558
const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/153215795374/assets.json`;
const H = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

const key = process.argv[2];
const file = process.argv[3];

if (process.argv[4] === 'push') {
  const content = readFileSync(file, 'utf8');
  const r = await fetch(BASE, { method: 'PUT', headers: H, body: JSON.stringify({ asset: { key, value: content } }) });
  const d = await r.json();
  console.log(d.asset ? `✓ DEV   ${d.asset.key} — ${d.asset.updated_at}` : 'ERR: ' + JSON.stringify(d.errors || d));
} else {
  const r = await fetch(`${BASE}?asset[key]=${key}`, { headers: H });
  const d = await r.json();
  if (!d.asset) { console.log('ERR:', JSON.stringify(d)); process.exit(1); }
  writeFileSync(file, d.asset.value, 'utf8');
  console.log(`Fetched ${key} (DEV) — updated_at: ${d.asset.updated_at}`);
}
