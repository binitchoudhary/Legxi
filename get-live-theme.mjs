import 'dotenv/config';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';
const H = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

async function getLiveTheme() {
  const res = await fetch(`https://${STORE}/admin/api/${API_VERSION}/themes.json`, { headers: H });
  const data = await res.json();
  const liveTheme = data.themes.find(t => t.role === 'main');
  console.log("Live theme ID is:", liveTheme.id);
  console.log("Live theme name is:", liveTheme.name);
}

getLiveTheme();
