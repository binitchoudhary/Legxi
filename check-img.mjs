import 'dotenv/config';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';
const H = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

async function checkImg() {
  const query = `query { products(first: 1, query: "title:'LEGXI Argentina Heritage Minis'") { edges { node { images(first:1) { edges { node { url } } } } } } }`;
  const res = await fetch(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

checkImg();
