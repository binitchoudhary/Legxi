import 'dotenv/config';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';
const GQL_URL = `https://${STORE}/admin/api/${VERSION}/graphql.json`;

async function run() {
  const response = await fetch(GQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query: `query { pages(first: 1, query: "handle:career") { edges { node { id seo { title hidden } metafield(namespace: "seo", key: "hidden") { id value } } } } }` })
  });
  console.log(JSON.stringify((await response.json()).data, null, 2));
}
run();
