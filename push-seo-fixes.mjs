import 'dotenv/config';
import { readFileSync } from 'fs';

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/150920200366/assets.json`;
const HEADERS = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

async function pushAsset(key, filePath) {
  const content = readFileSync(filePath, 'utf8');
  const b64 = Buffer.from(content).toString('base64');
  const res = await fetch(BASE, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify({ asset: { key, attachment: b64 } })
  });
  const d = await res.json();
  if (d.asset) {
    console.log(`LIVE ✓ ${d.asset.key} — updated at ${d.asset.updated_at}`);
  } else {
    console.log(`ERR ${key}:`, JSON.stringify(d.errors || d));
  }
}

await pushAsset('templates/robots.txt.liquid', 'theme/templates/robots.txt.liquid');
await pushAsset('layout/theme.liquid', 'theme/fetched-layout-theme.liquid');
