import 'dotenv/config';
import { readFileSync } from 'fs';

const STORE   = process.env.SHOPIFY_STORE;
const TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const DEV     = 152614928558;
const LIVE    = 150920200366;
const BASE    = `https://${STORE}/admin/api/${VERSION}`;
const HEADERS = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

const files = [
  { key: 'sections/certificate-authentication.liquid', path: 'theme/sections/certificate-authentication.liquid' },
  { key: 'sections/ownership-transfer.liquid',         path: 'theme/sections/ownership-transfer.liquid' },
  { key: 'sections/certificate-admin.liquid',          path: 'theme/sections/certificate-admin.liquid' },
  { key: 'templates/page.ownership-transfer.json',     path: 'theme/templates/page.ownership-transfer.json' },
  { key: 'templates/page.certificate-admin.json',      path: 'theme/templates/page.certificate-admin.json' },
  { key: 'templates/page.authentication.json',         path: 'theme/templates/page.authentication.json' },
];

const THEME_ID = process.argv[2] === 'live' ? LIVE : DEV;
const target   = THEME_ID === LIVE ? 'LIVE' : 'DEV';

console.log(`\nPushing ${files.length} files to ${target} theme (${THEME_ID})...\n`);

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
  console.log(`\nPreview links:`);
  console.log(`  Transfer portal: https://${STORE}/pages/ownership-transfer?preview_theme_id=${DEV}`);
  console.log(`  Admin panel:     https://${STORE}/pages/certificate-admin?preview_theme_id=${DEV}`);
  console.log(`  Auth portal:     https://${STORE}/pages/authentication?preview_theme_id=${DEV}`);
}
