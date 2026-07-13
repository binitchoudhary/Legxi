import 'dotenv/config';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION;
const H = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

async function fetchGraphQL(query) {
  const res = await fetch(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ query })
  });
  const json = await res.json();
  return json.data;
}

async function getArticles() {
  const q = `
  query {
    articles(first: 5) {
      edges {
        node {
          handle
          title
          onlineStoreUrl
        }
      }
    }
  }`;
  
  const data = await fetchGraphQL(q);
  console.log("Articles:", JSON.stringify(data.articles.edges.map(e => e.node), null, 2));
}

getArticles();
