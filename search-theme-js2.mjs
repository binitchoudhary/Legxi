import 'dotenv/config';

const THEME_ID = '150920200366';
const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/${THEME_ID}/assets.json`;
const H = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

const res = await fetch(`${BASE}?asset[key]=assets/theme.js`, { headers: H });
const data = await res.json();
const js = data.asset.value;

// Find onVariantChange in ProductGallery
const variantChangeIdx = js.indexOf('onVariantChange_fn');
if (variantChangeIdx !== -1) {
  // Find the function definition
  const fnDefIdx = js.indexOf('onVariantChange_fn = function', variantChangeIdx);
  if (fnDefIdx !== -1) {
    console.log('=== onVariantChange_fn ===');
    console.log(js.substring(fnDefIdx, fnDefIdx + 1000));
  }
}

// Find onSectionRerender in ProductGallery  
const rerenderIdx = js.indexOf('onSectionRerender_fn = function');
if (rerenderIdx !== -1) {
  console.log('\n=== onSectionRerender_fn ===');
  console.log(js.substring(rerenderIdx, rerenderIdx + 1000));
}

// Find ProductForm class and its variant:change handling
const pfIdx = js.indexOf('ProductForm');
if (pfIdx !== -1) {
  // Search from this point for variant:change
  let searchFrom = pfIdx;
  while (true) {
    const nextIdx = js.indexOf('variant:change', searchFrom);
    if (nextIdx === -1) break;
    console.log('\n=== variant:change at', nextIdx, '===');
    console.log(js.substring(Math.max(0, nextIdx - 300), nextIdx + 300));
    searchFrom = nextIdx + 1;
  }
}

// Search for section re-rendering that might replace the grid
const renderIdx = js.indexOf('data-block-allow-rerender');
if (renderIdx !== -1) {
  console.log('\n=== data-block-allow-rerender ===');
  console.log(js.substring(Math.max(0, renderIdx - 500), renderIdx + 500));
}
