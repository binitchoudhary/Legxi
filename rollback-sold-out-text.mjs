// Rollback for the "Out of stock" -> "Sold Out" text change (2026-07-10).
// Restores locales/en.default.json on the LIVE theme (150920200366) to its exact
// pre-change state, backed up at backups/en.default.LIVE-BACKUP-20260710-221549.json.
//
// Usage: node rollback-sold-out-text.mjs
import 'dotenv/config';
import { readFileSync } from 'fs';

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/150920200366/assets.json`;
const H = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

const content = readFileSync('backups/en.default.LIVE-BACKUP-20260710-221549.json', 'utf8');
const r = await fetch(BASE, { method: 'PUT', headers: H, body: JSON.stringify({ asset: { key: 'locales/en.default.json', value: content } }) });
const d = await r.json();
console.log(d.asset ? `✓ ROLLED BACK  ${d.asset.key} — ${d.asset.updated_at}` : 'ERR: ' + JSON.stringify(d.errors || d));
