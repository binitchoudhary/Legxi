import fs from 'fs';
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

async function getLiveResources() {
  const q = `
  query {
    products(first: 50, query: "status:ACTIVE") {
      edges {
        node {
          handle
          title
        }
      }
    }
    collections(first: 20) {
      edges {
        node {
          handle
          title
        }
      }
    }
  }`;
  
  const data = await fetchGraphQL(q);
  const products = data.products.edges.map(e => e.node);
  const collections = data.collections.edges.map(e => e.node);
  
  return { products, collections };
}

async function main() {
  const { products, collections } = await getLiveResources();
  console.log("Live Products:");
  products.forEach(p => console.log(`  /products/${p.handle}  ->  ${p.title}`));
  
  console.log("\nLive Collections:");
  collections.forEach(c => console.log(`  /collections/${c.handle}  ->  ${c.title}`));
  
  const urlsText = fs.readFileSync('gsc_404_urls.txt', 'utf8');
  const brokenUrls = urlsText.split('\n')
    .map(line => line.trim())
    .filter(line => line)
    .map(line => line.replace(/^\d+\.\s*/, '').trim()); // extract actual URL

  const mappings = [];

  for (const url of brokenUrls) {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    let target = '/';

    // Heuristics for mapping
    if (path.includes('la-scaloneta') || path.includes('julian-alvarez') || path.includes('rodrigo-de-paul') || path.includes('lionel-messi') || path.includes('argentina')) {
      const p = products.find(p => p.handle.includes('argentine') || p.handle.includes('messi') || p.handle.includes('campeones'));
      if (p) target = `/products/${p.handle}`;
    } else if (path.includes('trinity-set') || path.includes('triple-legacy')) {
      const p = products.find(p => p.handle.includes('trio-set') || p.handle.includes('trinity'));
      if (p) target = `/products/${p.handle}`;
    } else if (path.includes('arshdeep-singh')) {
      const p = products.find(p => p.handle.includes('arshdeep-singh'));
      if (p) target = `/products/${p.handle}`;
    } else if (path.includes('jersey') || path.includes('normal-editions')) {
      target = '/collections/all';
    } else if (path.includes('/transfer/')) {
      target = '/pages/authentication'; // Transfer/lookup likely relates to auth
    } else {
      // Default to all collections
      target = '/collections/all';
    }

    // Special cases
    if (path === '/apps/secure-checkout') target = '/cart'; // Not indexable anyway, but 404->cart
    if (path.includes('/blogs/news/')) target = '/blogs/news';

    // Strip out parameters from source URL for the redirect
    mappings.push({ source: path, target });
  }

  // Deduplicate
  const uniqueMappings = [];
  const seen = new Set();
  mappings.forEach(m => {
    if (!seen.has(m.source)) {
      seen.add(m.source);
      uniqueMappings.push(m);
    }
  });

  console.log("\nProposed Redirects:");
  uniqueMappings.forEach(m => console.log(`${m.source.padEnd(55)} ->  ${m.target}`));
  
  fs.writeFileSync('redirect_mapping.json', JSON.stringify(uniqueMappings, null, 2));
}
main();
