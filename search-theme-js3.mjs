import 'dotenv/config';

const THEME_ID = '150920200366';
const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/${THEME_ID}/assets.json`;
const H = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

const res = await fetch(`${BASE}?asset[key]=assets/theme.js`, { headers: H });
const data = await res.json();
const js = data.asset.value;

// Find ProductRerender class
let idx = 0;
while (true) {
  const nextIdx = js.indexOf('ProductRerender', idx);
  if (nextIdx === -1) break;
  
  // Show context around each mention
  const context = js.substring(Math.max(0, nextIdx - 100), Math.min(js.length, nextIdx + 200));
  if (context.includes('class') || context.includes('observe-form') || context.includes('variant') || context.includes('rerender')) {
    console.log(`\n=== ProductRerender at ${nextIdx} ===`);
    console.log(context);
  }
  idx = nextIdx + 1;
}

// Search for observe-form handling
const observeIdx = js.indexOf('observe-form');
if (observeIdx !== -1) {
  console.log('\n\n=== observe-form ===');
  console.log(js.substring(Math.max(0, observeIdx - 500), observeIdx + 500));
}
