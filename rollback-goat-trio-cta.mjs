// Rollback for the GOAT Collector Trio Set SOLD OUT CTA update (2026-07-11):
//   - "BUY IT NOW" -> "SOLD OUT" text swap in snippets/gokwik-buy-now.liquid
//     (applies site-wide, wherever that snippet's existing availability check fires)
//   - "CONNECT WITH A COLLECTIBLES SPECIALIST" removal + "REGISTER INTEREST" addition
//     in templates/product.trinity-set.json
// Restores both files on the LIVE theme (150920200366) to their exact pre-change state.
//
// Usage: node rollback-goat-trio-cta.mjs
import 'dotenv/config';
import { readFileSync } from 'fs';

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/150920200366/assets.json`;
const H = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

async function restore(key, backupPath) {
  const content = readFileSync(backupPath, 'utf8');
  const r = await fetch(BASE, { method: 'PUT', headers: H, body: JSON.stringify({ asset: { key, value: content } }) });
  const d = await r.json();
  console.log(d.asset ? `✓ ROLLED BACK  ${d.asset.key} — ${d.asset.updated_at}` : 'ERR: ' + JSON.stringify(d.errors || d));
}

await restore('snippets/gokwik-buy-now.liquid', 'backups/gokwik-buy-now.LIVE-BACKUP-20260711-120123.liquid');
await restore('templates/product.trinity-set.json', 'backups/product.trinity-set.LIVE-BACKUP-20260711-120123.json');
