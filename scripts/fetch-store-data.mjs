import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VER   = process.env.SHOPIFY_API_VERSION;
const BASE  = `https://${STORE}/admin/api/${VER}`;
const H     = { 'X-Shopify-Access-Token': TOKEN };

async function fetchAll(endpoint) {
  let results = [];
  let url = BASE + endpoint + (endpoint.includes('?') ? '&' : '?') + 'limit=250';
  while (url) {
    const r = await fetch(url, { headers: H });
    const d = await r.json();
    const key = Object.keys(d)[0];
    results = results.concat(d[key]);
    const link = r.headers.get('link') || '';
    const next = link.match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
  }
  return results;
}

mkdirSync('backup', { recursive: true });

const [orders, customers, products, collections] = await Promise.all([
  fetchAll('/orders.json?status=any'),
  fetchAll('/customers.json'),
  fetchAll('/products.json'),
  fetchAll('/custom_collections.json'),
]);

writeFileSync('backup/orders.json',      JSON.stringify(orders,      null, 2));
writeFileSync('backup/customers.json',   JSON.stringify(customers,   null, 2));
writeFileSync('backup/products.json',    JSON.stringify(products,    null, 2));
writeFileSync('backup/collections.json', JSON.stringify(collections, null, 2));

console.log('Orders:',      orders.length);
console.log('Customers:',   customers.length);
console.log('Products:',    products.length);
console.log('Collections:', collections.length);
console.log('Done — saved to backup/');
