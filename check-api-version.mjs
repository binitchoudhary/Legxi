import 'dotenv/config';
const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

// Try different API versions
const versions = ['2024-10', '2024-07', '2024-04', '2024-01', '2023-10'];

for (const v of versions) {
  try {
    const res = await fetch(`https://${STORE}/admin/api/${v}/variants/47930504249518.json`, {
      headers: { 'X-Shopify-Access-Token': TOKEN }
    });
    const data = await res.json();
    console.log(`API ${v}: Status ${res.status}`);
    if (data.variant) {
      console.log(`  FOUND: ${data.variant.title} - Price: ${data.variant.price}`);
    } else {
      console.log(`  ${JSON.stringify(data).substring(0, 120)}`);
    }
  } catch (e) {
    console.log(`API ${v}: Error - ${e.message}`);
  }
}
