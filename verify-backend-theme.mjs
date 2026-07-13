import 'dotenv/config';
const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';
const H = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };
const THEME_ID = '150920200366';

async function checkTheme() {
  const res = await fetch(`https://${STORE}/admin/api/${API_VERSION}/themes/${THEME_ID}/assets.json?asset[key]=layout/theme.liquid`, { headers: H });
  const data = await res.json();
  const themeLiq = data.asset.value;
  const match = themeLiq.match(/<script[^>]+contentsquare[^>]+>/i);
  console.log("Backend theme tag:", match ? match[0] : "Not found");
}
checkTheme();
