// Rollback for the Trinity Register Interest button box-model fix (2026-07-11):
// restores product.trinity-set.json's #legxi-ri-btn CSS to its pre-fix state
// (hardcoded 14px/24px padding, no border-radius, custom font — matching
// Arshdeep's original styling) on the LIVE theme (150920200366).
//
// Usage: node rollback-trinity-ri-button-sizing.mjs
import 'dotenv/config';
import { readFileSync } from 'fs';

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/150920200366/assets.json`;
const H = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

const content = readFileSync('backups/product.trinity-set.LIVE-BACKUP-20260711-131219-presizing.json', 'utf8');
const r = await fetch(BASE, { method: 'PUT', headers: H, body: JSON.stringify({ asset: { key: 'templates/product.trinity-set.json', value: content } }) });
const d = await r.json();
console.log(d.asset ? `✓ ROLLED BACK  ${d.asset.key} — ${d.asset.updated_at}` : 'ERR: ' + JSON.stringify(d.errors || d));
