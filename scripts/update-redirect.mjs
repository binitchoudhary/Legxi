import 'dotenv/config';

const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const STORE = process.env.SHOPIFY_STORE;
const VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';

async function queryGraphQL(query, variables = {}) {
  const res = await fetch(`https://${STORE}/admin/api/${VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables })
  });
  return (await res.json()).data;
}

async function run() {
  const mutation = `
    mutation urlRedirectUpdate($id: ID!, $urlRedirect: UrlRedirectInput!) {
      urlRedirectUpdate(id: $id, urlRedirect: $urlRedirect) {
        urlRedirect {
          id
          path
          target
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    id: "gid://shopify/UrlRedirect/412458287278",
    urlRedirect: {
      target: "/products/arshdeep-x-legxi-as02-edition-cap"
    }
  };

  console.log("=== EXECUTING REDIRECT MUTATION ===");
  const data = await queryGraphQL(mutation, variables);
  console.log(JSON.stringify(data, null, 2));

  console.log("\\n=== VERIFYING LIVE REDIRECT ===");
  try {
    let url = 'https://legxi.co/products/edition-1';
    const res = await fetch(url, { redirect: 'manual' });
    console.log(`[${res.status}] ${url}`);
    if (res.status >= 300 && res.status < 400) {
      let location = res.headers.get('location');
      console.log(`  -> Location: ${location}`);
    }
  } catch(e) {
    console.log("Error checking live redirect", e);
  }
}

run();
