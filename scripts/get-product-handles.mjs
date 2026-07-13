import 'dotenv/config';

const STORE   = process.env.SHOPIFY_STORE;
const TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const BASE    = `https://${STORE}/admin/api/${VERSION}`;
const HEADERS = { 'X-Shopify-Access-Token': TOKEN };

// Fetch all products with their template_suffix
let url = `${BASE}/products.json?limit=250&fields=id,handle,title,template_suffix`;
const res = await fetch(url, { headers: HEADERS });
const { products } = await res.json();

console.log('Products using custom templates:\n');
products
  .filter(p => p.template_suffix)
  .forEach(p => {
    console.log(`  Title:    ${p.title}`);
    console.log(`  Handle:   ${p.handle}`);
    console.log(`  Template: product.${p.template_suffix}`);
    console.log(`  Preview:  https://${STORE}/products/${p.handle}?preview_theme_id=152614928558`);
    console.log('');
  });

console.log('\nAll products (for reference):');
products.forEach(p => console.log(`  ${p.handle} → template: ${p.template_suffix || '(default)'}`));
