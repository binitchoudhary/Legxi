import 'dotenv/config';
import { readFileSync } from 'fs';

const THEME_ID = '150920200366';
const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/${THEME_ID}/assets.json`;
const H = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

// Read local product-info.liquid
const localContent = readFileSync('theme/live/snippets/product-info.liquid', 'utf8');
console.log('Read local product-info.liquid — length:', localContent.length);

// Fetch current remote content to compare
const fetchRes = await fetch(`${BASE}?asset[key]=snippets/product-info.liquid`, { headers: H });
const fetchData = await fetchRes.json();
if (fetchData.asset) {
  console.log('Remote updated_at:', fetchData.asset.updated_at);
  console.log('Remote length:', fetchData.asset.value.length);
  
  // Find the lgxSyncVariant function in the remote
  const remoteContent = fetchData.asset.value;
  
  // Check if the card click handler exists in remote
  const cardClickMatch = remoteContent.match(/if \(card && !btn\) \{[^}]+\}/s);
  if (cardClickMatch) {
    console.log('\n=== CARD CLICK HANDLER IN REMOTE ===');
    console.log(cardClickMatch[0]);
  } else {
    console.log('!!! CARD CLICK HANDLER NOT FOUND IN REMOTE !!!');
  }
  
  // Check for lgxSyncVariant in remote
  const syncMatch = remoteContent.match(/function lgxSyncVariant\(\)[^]*?lgxPrevVariant = vd;\s*\n\s*\}/s);
  if (syncMatch) {
    console.log('\n=== lgxSyncVariant IN REMOTE ===');
    console.log(syncMatch[0]);
  }
} else {
  console.log('ERR fetching:', JSON.stringify(fetchData));
}
