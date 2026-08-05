import 'dotenv/config';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';
const GQL_URL = `https://${STORE}/admin/api/${VERSION}/graphql.json`;

async function fetchGraphQL(query, variables = {}) {
  const response = await fetch(GQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables })
  });
  return (await response.json()).data;
}

async function run() {
  const pageQ = `query { pages(first: 1, query: "handle:career") { edges { node { id } } } }`;
  const pageData = await fetchGraphQL(pageQ);
  const pageId = pageData.pages.edges[0]?.node?.id;
  
  if (!pageId) {
    console.log("Career page not found!");
    return;
  }
  
  console.log("Career Page ID:", pageId);
  
  // Set seo.hidden to 0
  const mut = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id namespace key value }
        userErrors { field message }
      }
    }
  `;
  
  const vars = {
    metafields: [
      {
        ownerId: pageId,
        namespace: "seo",
        key: "hidden",
        type: "integer",
        value: "0"
      }
    ]
  };
  
  const mutData = await fetchGraphQL(mut, vars);
  console.log(JSON.stringify(mutData, null, 2));
}
run();
