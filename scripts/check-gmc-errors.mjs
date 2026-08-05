import 'dotenv/config';

const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const STORE = process.env.SHOPIFY_STORE;
const VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';

async function queryGraphQL(query) {
  const res = await fetch(`https://${STORE}/admin/api/${VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query })
  });
  return (await res.json()).data;
}

async function run() {
  console.log("=== CHECKING GOOGLE CHANNEL ERRORS IN SHOPIFY ===");
  const q = `query {
    publications(first: 10) {
      edges {
        node {
          id
          name
          catalog {
            id
            status
          }
        }
      }
    }
  }`;
  
  const data = await queryGraphQL(q);
  console.log(JSON.stringify(data, null, 2));
}

run();
