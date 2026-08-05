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
  const mut = `
    mutation metafieldDelete($input: MetafieldDeleteInput!) {
      metafieldDelete(input: $input) {
        deletedId
        userErrors { field message }
      }
    }
  `;
  
  const vars = {
    input: { id: "gid://shopify/Metafield/35156489306286" }
  };
  
  const mutData = await fetchGraphQL(mut, vars);
  console.log(JSON.stringify(mutData, null, 2));
}
run();
