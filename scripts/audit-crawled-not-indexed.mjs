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
  return (await response.json()).data;
}

async function run() {
  const gql = `
    query {
      products(first: 50) {
        edges {
          node {
            handle
            title
            descriptionHtml
          }
        }
      }
    }
  `;
  const data = await fetchGraphQL(gql);
  const products = data.products.edges.map(e => e.node);
  
  const results = [];
  
  for (const p of products) {
    const text = p.descriptionHtml.replace(/<[^>]*>?/gm, '').trim();
    const wordCount = text.split(/\s+/).length;
    
    let issue = 'Expected Google Behavior';
    if (wordCount < 50) {
      issue = 'Content Issue (Thin content)';
    }
    
    // Check for exact same description as another product (soft duplicate)
    const duplicates = products.filter(other => other.handle !== p.handle && other.descriptionHtml === p.descriptionHtml);
    if (duplicates.length > 0) {
      issue = 'Content Issue (Soft duplicate)';
    }
    
    if (issue !== 'Expected Google Behavior') {
      results.push({
        url: `https://legxi.co/products/${p.handle}`,
        title: p.title,
        wordCount,
        issue,
        classification: issue
      });
    }
  }
  
  console.log(JSON.stringify(results.slice(0, 10), null, 2));
}

run().catch(console.error);
