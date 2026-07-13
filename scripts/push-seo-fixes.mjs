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
  { key: 'snippets/microdata-schema.liquid', path: 'theme/snippets/microdata-schema.liquid' },
  { key: 'snippets/breadcrumb.liquid', path: 'theme/snippets/breadcrumb.liquid' },
  { key: 'snippets/product-card.liquid', path: 'theme/snippets/product-card.liquid' },
  { key: 'snippets/blog-post-card.liquid', path: 'theme/snippets/blog-post-card.liquid' },
  { key: 'snippets/product-gallery.liquid', path: 'theme/snippets/product-gallery.liquid' },
  { key: 'layout/theme.liquid', path: 'theme/layout/theme.liquid' },
  { key: 'sections/blog-post-banner.liquid', path: 'theme/sections/blog-post-banner.liquid' },
  { key: 'sections/blog-banner.liquid', path: 'theme/sections/blog-banner.liquid' },
  { key: 'sections/collection-banner.liquid', path: 'theme/sections/collection-banner.liquid' },
  { key: 'sections/main-list-collections.liquid', path: 'theme/sections/main-list-collections.liquid' },
  { key: 'sections/main-product.liquid', path: 'theme/sections/main-product.liquid' },
  { key: 'sections/main-article.liquid', path: 'theme/sections/main-article.liquid' },
  { key: 'sections/footer.liquid', path: 'theme/sections/footer.liquid' },
  { key: 'templates/index.json', path: 'theme/templates/index.json' },
  { key: 'templates/page.auction.json', path: 'theme/templates/page.auction.json' },
  { key: 'templates/page.afa-x-legxi.json', path: 'theme/templates/page.afa-x-legxi.json' },
  { key: 'snippets/gokwik.liquid', path: 'theme/snippets/gokwik.liquid' },
  { key: 'sections/certificate-authentication.liquid', path: 'theme/sections/certificate-authentication.liquid' },
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
