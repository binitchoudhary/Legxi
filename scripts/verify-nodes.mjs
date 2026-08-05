import { readFileSync, writeFileSync } from 'fs';
import 'dotenv/config';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const API = 'https://' + STORE + '/admin/api/' + VERSION + '/graphql.json';
const HEADERS = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

const nodes = JSON.parse(readFileSync('nodes-to-fetch.json', 'utf8'));
let results = [];

async function fetchNodes() {
  const chunkSize = 50;
  for (let i = 0; i < nodes.length; i += chunkSize) {
    const chunk = nodes.slice(i, i + chunkSize);
    const query = `query {
      nodes(ids: ${JSON.stringify(chunk)}) {
        __typename
        ... on Product { id title status handle vendor descriptionHtml featuredImage { url } }
        ... on ProductVariant { id title sku price product { id status } }
      }
    }`;
    
    try {
      const res = await fetch(API, { method: 'POST', headers: HEADERS, body: JSON.stringify({ query }) });
      const data = await res.json();
      if (data.data && data.data.nodes) {
        data.data.nodes.forEach((node, index) => {
          results.push({
            requestedId: chunk[index],
            found: node !== null,
            node: node
          });
        });
      } else {
        console.error('Error fetching chunk:', data.errors);
      }
    } catch(e) {
      console.error(e);
    }
  }
  
  writeFileSync('node-results.json', JSON.stringify(results, null, 2));
  
  let stats = { total: nodes.length, found: 0, missing: 0 };
  results.forEach(r => r.found ? stats.found++ : stats.missing++);
  console.log('Node verification complete:', stats);
}

fetchNodes();
