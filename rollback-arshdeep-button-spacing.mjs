// Rollback for the Arshdeep Sold Out / Register Interest button spacing fix (2026-07-11):
// removes the targeted custom_css rule that reduced the gap between these two specific
// buttons (was using the theme's 1.75rem default; reduced to .625rem, matching Trinity)
// on the LIVE theme (150920200366).
//
// Usage: node rollback-arshdeep-button-spacing.mjs
import 'dotenv/config';
import { readFileSync } from 'fs';

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/150920200366/assets.json`;
const H = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

const content = readFileSync('backups/product.ball-hand-signed.LIVE-BACKUP-spacing.json', 'utf8');
const r = await fetch(BASE, { method: 'PUT', headers: H, body: JSON.stringify({ asset: { key: 'templates/product.ball-hand-signed.json', value: content } }) });
const d = await r.json();
console.log(d.asset ? `✓ ROLLED BACK  ${d.asset.key} — ${d.asset.updated_at}` : 'ERR: ' + JSON.stringify(d.errors || d));
