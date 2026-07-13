import 'dotenv/config';
const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';
const H = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

async function fetchGraphQL(query) {
  const res = await fetch(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ query })
  });
  return await res.json();
}

async function checkProduct() {
  const query = `
  query {
    products(first: 3, query: "handle:legxi-goat-collector-trio-set OR handle:god-of-cricket-100-centuries-edition OR handle:shreyas-iyer-hand-signed-white-gold-plated-artwork") {
      edges {
        node {
          title
          status
        }
      }
    }
  }`;
  const data = await fetchGraphQL(query);
  console.log(JSON.stringify(data, null, 2));
}

checkProduct();
