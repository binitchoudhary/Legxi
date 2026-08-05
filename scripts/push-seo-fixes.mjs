import 'dotenv/config';
import { readFileSync } from 'fs';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const DEV = 152614928558;
const LIVE = 150920200366;
const BASE = `https://${STORE}/admin/api/${VERSION}`;
const HEADERS = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

const files = [
  { key: 'snippets/social-meta-tags.liquid', path: 'theme/snippets/social-meta-tags.liquid' },
  { key: 'sections/legend_collection.liquid', path: 'theme/sections/legend_collection.liquid' },
  { key: 'sections/footer.liquid', path: 'theme/sections/footer.liquid' },
  { key: 'sections/footer-live-fetched.liquid', path: 'theme/sections/footer-live-fetched.liquid' },
];

const THEME_ID = process.argv[2] === 'live' ? LIVE : DEV;
const target = THEME_ID === LIVE ? 'LIVE' : 'DEV';

console.log(`\nPushing ${files.length} SEO files to ${target} theme (${THEME_ID})...\n`);

for (const f of files) {
  const value = readFileSync(f.path, 'utf8');
  const res = await fetch(`${BASE}/themes/${THEME_ID}/assets.json`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify({ asset: { key: f.key, value } }),
  });
  const d = await res.json();
  if (res.ok) {
    console.log(`✓ ${f.key}`);
  } else {
    console.log(`✗ ${f.key}: ${JSON.stringify(d.errors)}`);
  }
  await new Promise(r => setTimeout(r, 600));
}

console.log(`\nDone! ${target} theme updated.`);
if (THEME_ID === DEV) {
  console.log(`Preview: https://${STORE}/?preview_theme_id=${DEV}`);
}
