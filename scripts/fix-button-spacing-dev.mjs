import 'dotenv/config';
import { readFileSync } from 'fs';

const STORE   = process.env.SHOPIFY_STORE;
const TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const DEV     = 152614928558;
const BASE    = `https://${STORE}/admin/api/${VERSION}`;
const HEADERS = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

const SPACING_RULE = '[data-block-type="button"] + [data-block-type="button"] { margin-top: -8px; }';

const TEMPLATES = [
  { key: 'templates/product.argentine-icons-24k.json',       src: 'live-templates/product.argentine-icons-24k.json' },
  { key: 'templates/product.campeones-world-cup-2022.json',  src: 'live-templates/updated-product.campeones-world-cup-2022.json' },
  { key: 'templates/product.la-scaloneta-2026-edition.json', src: 'live-templates/updated-product.la-scaloneta-2026-edition.json' },
  { key: 'templates/product.trinity-set.json',               src: 'live-templates/updated-product.trinity-set.json' },
];

async function push(key, value) {
  const res = await fetch(`${BASE}/themes/${DEV}/assets.json`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify({ asset: { key, value } }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(d.errors));
  console.log(`✓ ${key}`);
  await new Promise(r => setTimeout(r, 700));
}

for (const { key, src } of TEMPLATES) {
  const template = JSON.parse(readFileSync(src, 'utf8'));
  const css = template.sections.main.custom_css || [];
  if (!css.some(r => r.includes('data-block-type="button"]'))) {
    css.push(SPACING_RULE);
    template.sections.main.custom_css = css;
  }
  await push(key, JSON.stringify(template, null, 2));
}

console.log('\nPreview links:');
console.log('  https://5ci887-xv.myshopify.com/products/argentine-icons-24k-signature-series?preview_theme_id=152614928558');
console.log('  https://5ci887-xv.myshopify.com/products/campeones-world-cup-2022-edition?preview_theme_id=152614928558');
console.log('  https://5ci887-xv.myshopify.com/products/la-scaloneta-squad-edition?preview_theme_id=152614928558');
console.log('  https://5ci887-xv.myshopify.com/products/legxi-champions-trinity-set-1?preview_theme_id=152614928558');
