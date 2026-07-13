import 'dotenv/config';
const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

async function restGet(path) {
  const res = await fetch(`https://${STORE}/admin/api/2024-10/${path}`, {
    headers: { 'X-Shopify-Access-Token': TOKEN }
  });
  return { status: res.status, data: await res.json() };
}

// Check Google & YouTube Sales Channel
console.log('=== CHECKING PRICING RULES ===');
const { data: priceRules } = await restGet('price_rules.json');
console.log(`Total price rules: ${priceRules.price_rules?.length || 0}`);

// Check the product for the Argentine Icons
console.log('\n=== ARGENTINE ICONS VARIANTS (FULL) ===');
const { data: prodData } = await restGet('products/9143560437934.json');
if (prodData.product) {
  for (const v of prodData.product.variants) {
    console.log(`${v.id}: ${v.title} | Price: ${v.price} | CompareAt: ${v.compare_at_price} | SKU: ${v.sku} | Barcode: ${v.barcode} | Inventory: ${v.inventory_quantity}`);
  }
}

// Check for all products to find Trinity Set
console.log('\n=== SEARCH FOR TRINITY PRODUCTS ===');
const { data: allProds } = await restGet('products.json?title=Trinity');
if (allProds.products) {
  for (const p of allProds.products) {
    console.log(`${p.id}: ${p.title} (${p.status}) - ${p.handle}`);
    for (const v of p.variants) {
      console.log(`  Variant ${v.id}: ${v.title} - Price: ${v.price}`);
    }
  }
}

// Check Products JSON-LD currently on product page
console.log('\n=== CURRENT PRODUCT PAGE STRUCTURED DATA ===');
// Check if microdata-schema.liquid adds Product schema
const { data: themeAssets } = await restGet('themes/150920200366/assets.json');
const snippetFiles = themeAssets.assets?.filter(a => a.key.startsWith('snippets/'))?.map(a => a.key) || [];
console.log('Available snippets:');
for (const s of snippetFiles) {
  if (s.includes('schema') || s.includes('microdata') || s.includes('product')) {
    console.log(`  ${s}`);
  }
}

// Check the actual price of the invalid price products
console.log('\n=== INVALID PRICE VARIANT DETAILS ===');
const variantIds = [
  '47970894053550', '47970894086318', '47970894119086', 
  '47970894151854', '47970909094062', '47970894020782',
  '47975039991982', '47975040647342'
];
for (const vid of variantIds) {
  const { data, status } = await restGet(`variants/${vid}.json`);
  if (data.variant) {
    console.log(`Variant ${vid}: ${data.variant.title} | Price: ${data.variant.price} | CompareAt: ${data.variant.compare_at_price}`);
  } else if (status === 404) {
    console.log(`Variant ${vid}: DELETED/NOT FOUND`);
  } else {
    console.log(`Variant ${vid}: ${JSON.stringify(data).substring(0, 100)}`);
  }
}
