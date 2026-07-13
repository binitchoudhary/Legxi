// Rollback for the Arshdeep Singh SOLD OUT button addition (2026-07-11):
//   - snippets/buy-buttons.liquid: removes 'ball-hand-signed' from the _no_atc list
//   - templates/product.ball-hand-signed.json: re-disables the buy_buttons block
// Restores both files on the LIVE theme (150920200366) to their exact pre-change state.
//
// Usage: node rollback-arshdeep-sold-out-button.mjs
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

await restore('snippets/buy-buttons.liquid', 'backups/buy-buttons.LIVE-BACKUP-20260711-123014.liquid');
await restore('templates/product.ball-hand-signed.json', 'backups/product.ball-hand-signed.LIVE-BACKUP-20260711-123014.json');
