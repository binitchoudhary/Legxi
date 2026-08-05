import 'dotenv/config';
import fs from 'fs';

const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const STORE = process.env.SHOPIFY_STORE || 'legxi.co';

async function run() {
  const query = `{ product(id: "gid://shopify/Product/9132640731310") { seo { title description } } }`;
  const res = await fetch(`https://${STORE}/admin/api/2023-10/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query })
  });
  console.log(JSON.stringify((await res.json()).data, null, 2));
}

run();
