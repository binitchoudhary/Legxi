import 'dotenv/config';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';
const BASE_URL = `https://${STORE}/admin/api/${VERSION}/graphql.json`;

async function fetchGraphQL(query, variables = {}) {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables })
  });
  const data = await response.json();
  if (data.errors) {
    console.error(data.errors);
  }
  return data.data;
}

async function run() {
  console.log('\n--- GATE 3 ---');
  const pageQ = `query { pages(first: 1, query: "handle:career") { edges { node { title bodySummary isPublished } } } }`;
  const pageData = await fetchGraphQL(pageQ);
  console.log('Career Page:', pageData.pages.edges[0]?.node);

  console.log('\n--- GATE 4 ---');
  const products = ['legxi-goat-collector-trio-set', 'god-of-cricket-100-centuries-edition', 'shreyas-iyer-hand-signed-white-gold-plated-artwork'];
  for (const handle of products) {
    const pQ = `query { products(first: 1, query: "handle:${handle}") { edges { node { title status publishedAt seo { title } } } } }`;
    const pData = await fetchGraphQL(pQ);
    console.log(`Product ${handle}:`, pData.products.edges[0]?.node);
  }
}

run().catch(console.error);
