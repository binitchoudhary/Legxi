/**
 * Fixes the section order in all 4 product templates so specialist_form_popup
 * renders BEFORE specialist_form_apps. This ensures the hiding CSS is in the DOM
 * before the form section renders, preventing the flicker on page load.
 *
 * Also pushes the updated specialist-form-popup.liquid to live.
 */
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';

const STORE   = process.env.SHOPIFY_STORE;
const TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const LIVE    = 150920200366;
const BASE    = `https://${STORE}/admin/api/${VERSION}`;
const HEADERS = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

async function push(key, value) {
  const res = await fetch(`${BASE}/themes/${LIVE}/assets.json`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify({ asset: { key, value } }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(`✗ ${key}: ${JSON.stringify(d.errors)}`);
  console.log(`✓ ${key}`);
  await new Promise(r => setTimeout(r, 700));
}

// 1. Push updated section file
const sectionContent = readFileSync('theme/sections/specialist-form-popup.liquid', 'utf8');
await push('sections/specialist-form-popup.liquid', sectionContent);

// 2. Fix order in each template
const TEMPLATES = [
  { key: 'templates/product.argentine-icons-24k.json',       live: 'live-templates/product.argentine-icons-24k.json' },
  { key: 'templates/product.campeones-world-cup-2022.json',  live: 'live-templates/updated-product.campeones-world-cup-2022.json' },
  { key: 'templates/product.la-scaloneta-2026-edition.json', live: 'live-templates/updated-product.la-scaloneta-2026-edition.json' },
  { key: 'templates/product.trinity-set.json',               live: 'live-templates/updated-product.trinity-set.json' },
];

for (const { key, live } of TEMPLATES) {
  const template = JSON.parse(readFileSync(live, 'utf8'));
  const order = template.order;

  const appsIdx   = order.indexOf('specialist_form_apps');
  const popupIdx  = order.indexOf('specialist_form_popup');

  if (appsIdx === -1 || popupIdx === -1) {
    console.log(`  Skipping ${key} — popup sections not found in order`);
    continue;
  }

  // Remove both, then re-insert popup before apps right after main
  order.splice(Math.max(appsIdx, popupIdx), 1);
  order.splice(Math.min(appsIdx, popupIdx), 1);

  const mainIdx = order.indexOf('main');
  order.splice(mainIdx + 1, 0, 'specialist_form_popup', 'specialist_form_apps');

  const updated = JSON.stringify(template, null, 2);
  await push(key, updated);
}

console.log('\nDone. Flicker fix is live.');
