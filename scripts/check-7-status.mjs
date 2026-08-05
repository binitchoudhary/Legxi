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
  const q = `query {
    pages(first: 10, query: "handle:giveaway-quiz OR handle:kp-account OR handle:registration-form OR handle:authentication OR handle:afa-x-legxi-thank-you") {
      edges { node { handle isPublished } }
    }
  }`;
  console.log(JSON.stringify(await queryGraphQL(q), null, 2));
}
run();
