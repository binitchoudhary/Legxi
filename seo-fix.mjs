import 'dotenv/config';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VER   = process.env.SHOPIFY_API_VERSION;
const BASE  = `https://${STORE}/admin/api/${VER}`;
const H     = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

// Check all 4 draft/deleted products
const handles = [
  'god-of-cricket-100-centuries-edition',
  'match-worn-icc-t20-world-cup-2026-jersey',
  'shreyas-iyer-hand-signed-white-gold-plated-artwork',
  'shreyas-iyer-si-96-artwork-collectible',
];

for (const h of handles) {
  const r = await fetch(`${BASE}/products.json?handle=${h}`, { headers: H });
  const d = await r.json();
  const p = d.products?.[0];
  console.log(`/products/${h}  →  ${p ? `[${p.status}] EXISTS` : 'NOT FOUND (deleted)'}`);
}
