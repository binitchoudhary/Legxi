
import 'dotenv/config';
import { readFileSync } from 'fs';

const STORE        = process.env.SHOPIFY_STORE;
const TOKEN        = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION      = process.env.SHOPIFY_API_VERSION;
const BASE         = 'https://' + STORE + '/admin/api/' + VERSION;
const HEADERS      = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };
const LIVE_THEME_ID = 150920200366;

const file = 'theme/sections/ownership-transfer.liquid';
const key = 'sections/ownership-transfer.liquid';

async function upload() {
  const body = JSON.stringify({ asset: { key, value: readFileSync(file, 'utf8') } });
  const res = await fetch(BASE + '/themes/' + LIVE_THEME_ID + '/assets.json', {
    method: 'PUT', headers: HEADERS, body,
  });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + await res.text());
  console.log('Production Upload complete');
}
upload().catch(console.error);

