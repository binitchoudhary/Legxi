import 'dotenv/config';

const THEME_ID = '150920200366';
const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/${THEME_ID}/assets.json`;
const H = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

// Fetch theme.js
const res = await fetch(`${BASE}?asset[key]=assets/theme.js`, { headers: H });
const data = await res.json();
if (data.asset && data.asset.value) {
  const js = data.asset.value;
  console.log('theme.js length:', js.length);
  
  // Search for variant:change
  const idx = js.indexOf('variant:change');
  if (idx !== -1) {
    console.log('FOUND variant:change at index', idx);
    console.log('Context:', js.substring(Math.max(0, idx - 200), idx + 200));
  } else {
    console.log('variant:change NOT found in theme.js');
  }
  
  // Search for variant-change
  const idx2 = js.indexOf('variant-change');
  if (idx2 !== -1) {
    console.log('\nFOUND variant-change at index', idx2);
    console.log('Context:', js.substring(Math.max(0, idx2 - 200), idx2 + 200));
  }

  // Search for product-rerender  
  const idx3 = js.indexOf('product-rerender');
  if (idx3 !== -1) {
    console.log('\nFOUND product-rerender at index', idx3);
  }
  
  // Search for section rendering
  const idx4 = js.indexOf('section_id');
  if (idx4 !== -1) {
    console.log('\nFOUND section_id at index', idx4);
    console.log('Context:', js.substring(Math.max(0, idx4 - 100), idx4 + 200));
  }
} else {
  console.log('ERR:', JSON.stringify(data));
}
