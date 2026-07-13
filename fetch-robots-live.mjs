import 'dotenv/config';

const THEME_ID = '150920200366'; // Using the theme ID from other scripts
const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/${THEME_ID}/assets.json?asset[key]=templates/robots.txt.liquid`;
const H = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

const res = await fetch(BASE, { headers: H });
const data = await res.json();
if (data.asset) {
  console.log(data.asset.value);
} else {
  console.log('ERR fetching:', JSON.stringify(data.errors || data));
}
