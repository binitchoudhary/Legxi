import 'dotenv/config';
import fs from 'fs';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';
const BASE_URL = `https://${STORE}/admin/api/${VERSION}/graphql.json`;

async function fetchGraphQL(query, variables = {}) {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN,
    },
    body: JSON.stringify({ query, variables })
  });
  const data = await response.json();
  if (data.errors) throw new Error(JSON.stringify(data.errors));
  return data.data;
}

const urls = fs.readFileSync('gsc_404_urls.txt', 'utf8')
  .split('\n')
  .map(u => u.replace(/^\d+\.\s*/, '').trim())
  .filter(Boolean);

async function searchSimilarProducts(query) {
  const gql = `
    query searchProducts($query: String!) {
      products(first: 3, query: $query) {
        edges { node { handle title status } }
      }
    }
  `;
  const data = await fetchGraphQL(gql, { query: `title:*${query}*` });
  return data.products.edges.map(e => e.node);
}

async function searchCollections(query) {
  const gql = `
    query searchCollections($query: String!) {
      collections(first: 3, query: $query) {
        edges { node { handle title } }
      }
    }
  `;
  const data = await fetchGraphQL(gql, { query: `title:*${query}*` });
  return data.collections.edges.map(e => e.node);
}

async function run() {
  const results = [];
  for (const url of urls) {
    let type = 'unknown';
    let handle = '';
    
    if (url.includes('/products/')) {
      type = 'product';
      handle = url.split('/products/')[1].split('?')[0];
    } else if (url.includes('/collections/')) {
      type = 'collection';
      handle = url.split('/collections/')[1].split('?')[0];
    } else if (url.includes('/pages/')) {
      type = 'page';
      handle = url.split('/pages/')[1].split('?')[0];
    } else if (url.includes('/blogs/')) {
      type = 'article';
    } else {
      type = 'custom';
    }
    
    let queryTerm = handle.replace(/-/g, ' ');
    // Handle specific Legxi patterns
    if (queryTerm.includes('slot')) queryTerm = queryTerm.replace(/slot \d+/g, '').trim();
    if (queryTerm.includes('trinity set')) queryTerm = 'trinity set';
    if (queryTerm.includes('normal editions')) queryTerm = 'normal editions';
    if (queryTerm.includes('la scaloneta')) queryTerm = 'scaloneta';
    
    let replacement = null;
    let confidence = 0;
    let action = 'Leave 404 with justification';
    let justification = 'No obvious replacement.';

    if (type === 'product' && queryTerm) {
      const similar = await searchSimilarProducts(queryTerm);
      if (similar.length > 0 && similar[0].status === 'ACTIVE') {
        replacement = `/products/${similar[0].handle}`;
        confidence = similar[0].title.toLowerCase().includes(queryTerm.toLowerCase()) ? 90 : 60;
        action = `301 → exact replacement product`;
      } else {
        const simCol = await searchCollections(queryTerm);
        if (simCol.length > 0) {
          replacement = `/collections/${simCol[0].handle}`;
          confidence = 70;
          action = `301 → most relevant collection`;
        } else {
           action = `410 Gone`;
           justification = 'Product permanently removed, no similar product or collection found.';
        }
      }
    } else if (type === 'custom') {
       action = `Leave 404 with justification`;
       justification = 'Custom app route or non-standard path.';
    } else {
       action = `410 Gone`;
       justification = 'Page/Collection deleted, no direct replacement.';
    }

    results.push({
      oldUrl: url,
      handle,
      queryTerm,
      replacement,
      action,
      confidence,
      justification
    });
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  fs.writeFileSync('forensic_404_audit.json', JSON.stringify(results, null, 2));
  console.log('404 Audit Complete. Results saved to forensic_404_audit.json');
}

run().catch(console.error);
