import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const STORE      = process.env.SHOPIFY_STORE || '5ci887-xv.myshopify.com';
const TOKEN      = process.env.SHOPIFY_ADMIN_TOKEN || '';
const LIVE_THEME = '150920200366'; // Gokwik Theme 27th March 2026 [live]
const FILE_KEY   = 'sections/media-wall.liquid';

const filePath = join(__dirname, 'theme', 'sections', 'media-wall.liquid');
const content  = readFileSync(filePath, 'utf8');
const value    = Buffer.from(content).toString('base64');

const url = `https://${STORE}/admin/api/2025-10/themes/${LIVE_THEME}/assets.json`;

console.log(`Uploading ${FILE_KEY} to live theme ${LIVE_THEME}...`);

const res = await fetch(url, {
  method: 'PUT',
  headers: {
    'X-Shopify-Access-Token': TOKEN,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    asset: {
      key:            FILE_KEY,
      attachment:     value,
      content_type:   'text/x-liquid; charset=utf-8',
    }
  })
});

const data = await res.json();

if (res.ok && data.asset) {
  console.log(`\n✅ SUCCESS — media-wall.liquid is now live!`);
  console.log(`   Theme ID : ${LIVE_THEME}`);
  console.log(`   Key      : ${data.asset.key}`);
  console.log(`   Updated  : ${data.asset.updated_at}`);
  console.log(`\n🌐 Live store: https://${STORE}`);
} else {
  console.error(`\n❌ FAILED (HTTP ${res.status})`);
  console.error(JSON.stringify(data, null, 2));
  process.exit(1);
}
