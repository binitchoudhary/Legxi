import 'dotenv/config';
const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const DEV = 152614928558;
const BASE = `https://${STORE}/admin/api/${VERSION}`;

const res = await fetch(`${BASE}/themes/${DEV}/assets.json?asset[key]=templates/product.argentine-icons-24k.json`, {
  headers: { 'X-Shopify-Access-Token': TOKEN }
});
const d = await res.json();
const c = d.asset.value;
console.log('has specialist_form_apps:', c.includes('specialist_form_apps'));
console.log('button link is #specialist-form:', c.includes('#specialist-form'));
console.log('has specialist-form-popup section:', c.includes('specialist-form-popup'));
