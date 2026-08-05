import 'dotenv/config';

const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const STORE = process.env.SHOPIFY_STORE || 'legxi.co';
const VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';

async function queryGraphQL(query) {
  const res = await fetch(`https://${STORE}/admin/api/${VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query })
  });
  console.log(await res.text());
}

queryGraphQL(`query { product(id: "gid://shopify/Product/9132640731310") { id handle title descriptionHtml updatedAt } }`);
