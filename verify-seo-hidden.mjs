import 'dotenv/config';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';
const H = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

async function fetchGraphQL(query, variables = {}) {
  const res = await fetch(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json();
  return json.data;
}

async function checkPage(handle) {
  const query = `
  query getPage($query: String!) {
    pages(first: 1, query: $query) {
      edges {
        node {
          title
          handle
          onlineStoreUrl
          metafield(namespace: "seo", key: "hidden") {
            value
          }
        }
      }
    }
  }`;
  const data = await fetchGraphQL(query, { query: `handle:${handle}` });
  if (data?.pages?.edges?.length > 0) {
    const node = data.pages.edges[0].node;
    console.log(`Handle: ${node.handle}`);
    console.log(`Title: ${node.title}`);
    console.log(`URL: ${node.onlineStoreUrl}`);
    console.log(`seo.hidden metafield: ${node.metafield ? node.metafield.value : 'Not Set'}`);
    
    // Check live robots tag
    if (node.onlineStoreUrl) {
      const res = await fetch(node.onlineStoreUrl);
      const html = await res.text();
      const robotsMatch = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);
      console.log(`Live Robots Meta: ${robotsMatch ? robotsMatch[1] : 'None'}\n`);
    }
  } else {
    console.log(`Handle: ${handle} NOT FOUND\n`);
  }
}

async function main() {
  const handles = [
    'registration-form',
    'giveaway-quiz',
    'data-sharing-opt-out',
    'kp-account',
    'authentication',
    'career',
    'afa-x-legxi-thank-you'
  ];
  for (const h of handles) {
    await checkPage(h);
  }
}
main();
