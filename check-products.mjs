import 'dotenv/config';
const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

// Try fetching products by numeric ID
const productIds = ['9135869231278', '9143560437934'];

for (const pid of productIds) {
  try {
    const res = await fetch(`https://${STORE}/admin/api/2024-10/products/${pid}.json`, {
      headers: { 'X-Shopify-Access-Token': TOKEN }
    });
    const data = await res.json();
    console.log(`\n=== Product ${pid} ===`);
    console.log(`Status: ${res.status}`);
    if (data.product) {
      console.log(`Title: ${data.product.title}`);
      console.log(`Handle: ${data.product.handle}`);
      console.log(`Status: ${data.product.status}`);
      console.log(`Variants: ${data.product.variants.length}`);
      for (const v of data.product.variants) {
        console.log(`  Variant ${v.id}: ${v.title} - Price: ${v.price} - SKU: ${v.sku}`);
      }
      console.log(`Images: ${data.product.images.length}`);
      for (const img of data.product.images) {
        console.log(`  ${img.id}: ${img.src} (${img.width}x${img.height})`);
      }
    } else {
      console.log(`Error: ${JSON.stringify(data)}`);
    }
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
}
