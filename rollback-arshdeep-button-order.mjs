// Rollback for the Arshdeep Register Interest / Sold Out button reorder (2026-07-11):
// restores product.ball-hand-signed.json's block_order to have liquid_WwHYcj (Register
// Interest) before buy_buttons_qQTg7a (Sold Out) — i.e. undoes the swap that made Sold
// Out appear first, matching Trinity's order — on the LIVE theme (150920200366).
//
// Usage: node rollback-arshdeep-button-order.mjs
import 'dotenv/config';
import { readFileSync } from 'fs';

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/150920200366/assets.json`;
const H = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

const content = readFileSync('backups/product.ball-hand-signed.LIVE-BACKUP-20260711-reorder.json', 'utf8');
const r = await fetch(BASE, { method: 'PUT', headers: H, body: JSON.stringify({ asset: { key: 'templates/product.ball-hand-signed.json', value: content } }) });
const d = await r.json();
console.log(d.asset ? `✓ ROLLED BACK  ${d.asset.key} — ${d.asset.updated_at}` : 'ERR: ' + JSON.stringify(d.errors || d));
