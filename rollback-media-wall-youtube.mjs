// Rollback for the Media Wall YouTube-embed support fix (2026-07-10).
// Restores sections/media-wall.liquid on the LIVE theme (150920200366) to its exact
// pre-change state, backed up at backups/media-wall.LIVE-BACKUP-20260710-190551.liquid.
//
// Usage: node rollback-media-wall-youtube.mjs
import 'dotenv/config';
import { readFileSync } from 'fs';

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/150920200366/assets.json`;
const H = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

const content = readFileSync('backups/media-wall.LIVE-BACKUP-20260710-190551.liquid', 'utf8');
const r = await fetch(BASE, { method: 'PUT', headers: H, body: JSON.stringify({ asset: { key: 'sections/media-wall.liquid', value: content } }) });
const d = await r.json();
console.log(d.asset ? `✓ ROLLED BACK  ${d.asset.key} — ${d.asset.updated_at}` : 'ERR: ' + JSON.stringify(d.errors || d));
