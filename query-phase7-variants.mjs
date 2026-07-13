import 'dotenv/config';
const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-10';

async function restGet(path) {
  const res = await fetch(`https://${STORE}/admin/api/${API_VERSION}/${path}`, {
    headers: { 'X-Shopify-Access-Token': TOKEN }
  });
  return res.json();
}

// Check invalid price variants using REST API
const variantIds = [
  '47930504249518', // Trinity Set Slot 03
  '47975039991982', // Argentine Icons Emiliano Martinez Edition #010
  '47975040647342', // Argentine Icons Julian Alvarez Edition #010
  '47970894020782', // Argentine Icons Emiliano Martinez (no edition)
  '47970894053550', // Argentine Icons Enzo Fernandes SYSTEM
  '47970894086318', // Argentine Icons Julian Alvarez SYSTEM
  '47970894119086', // Argentine Icons Lautaro Martinez SYSTEM
  '47970894151854', // Argentine Icons Rodrigo De Paul SYSTEM
  '47970909094062', // Argentine Icons Lionel Messi SYSTEM
];

for (const vid of variantIds) {
  try {
    const data = await restGet(`variants/${vid}.json`);
    const v = data.variant;
    if (v) {
      console.log(`\n=== Variant ${vid} ===`);
      console.log(`Title: ${v.title}`);
      console.log(`Price: ${v.price}`);
      console.log(`Compare-at: ${v.compare_at_price}`);
      console.log(`SKU: ${v.sku}`);
      console.log(`Barcode: ${v.barcode}`);
      console.log(`Product ID: ${v.product_id}`);
      console.log(`Image ID: ${v.image_id}`);
    } else {
      console.log(`\nVariant ${vid}: NOT FOUND - ${JSON.stringify(data)}`);
    }
  } catch (e) {
    console.log(`\nVariant ${vid}: Error - ${e.message}`);
  }
}

// Check Trinity Set Slot 03 product
console.log('\n\n=== TRINITY SET SLOT 03 ===');
try {
  const prodData = await restGet('products/9135869231278.json');
  const p = prodData.product;
  if (p) {
    console.log(`Title: ${p.title}`);
    console.log(`Handle: ${p.handle}`);
    console.log(`Status: ${p.status}`);
    console.log(`Images:`);
    for (const img of p.images) {
      console.log(`  ${img.id}: ${img.src} (${img.width}x${img.height})`);
    }
    console.log(`Variants:`);
    for (const v of p.variants) {
      console.log(`  ${v.id}: ${v.title} - Price: ${v.price} - CompareAt: ${v.compare_at_price}`);
    }
  }
} catch (e) {
  console.log(`Error: ${e.message}`);
}
