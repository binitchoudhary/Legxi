// Rollback for the Argentina Fan Collection spacing + font-size changes (2026-07-10).
// Restores templates/collection.afa-all-collectibles.json on the LIVE theme (150920200366)
// to its exact pre-fontSize-change state.
// Note: sections/featured-collections.liquid's spacing fix was already live before this
// script existed and is scoped via `section.id == 'featured_collections_AgTWrj'`, so it
// cannot affect any other section; no rollback path is provided for it here.
//
// Usage: node rollback-argentina-fan-collection.mjs
import 'dotenv/config';
import { readFileSync } from 'fs';

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/150920200366/assets.json`;
const H = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

const content = readFileSync('backups/collection.afa-all-collectibles.LIVE-RECHECK.json', 'utf8');
const r = await fetch(BASE, { method: 'PUT', headers: H, body: JSON.stringify({ asset: { key: 'templates/collection.afa-all-collectibles.json', value: content } }) });
const d = await r.json();
console.log(d.asset ? `✓ ROLLED BACK  ${d.asset.key} — ${d.asset.updated_at}` : 'ERR: ' + JSON.stringify(d.errors || d));
