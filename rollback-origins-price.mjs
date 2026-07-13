// Rollback for the LEGXI Origins of Champions collection-card price override (2026-07-09).
// Restores snippets/price-list.liquid on the LIVE theme (150920200366) to its exact
// pre-change state, backed up at backups/price-list.LIVE-BACKUP-20260709-141145.liquid.
//
// Usage: node rollback-origins-price.mjs
import 'dotenv/config';
import { readFileSync } from 'fs';

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/150920200366/assets.json`;
const H = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

const content = readFileSync('backups/price-list.LIVE-BACKUP-20260709-141145.liquid', 'utf8');
const r = await fetch(BASE, { method: 'PUT', headers: H, body: JSON.stringify({ asset: { key: 'snippets/price-list.liquid', value: content } }) });
const d = await r.json();
console.log(d.asset ? `✓ ROLLED BACK  ${d.asset.key} — ${d.asset.updated_at}` : 'ERR: ' + JSON.stringify(d.errors || d));
