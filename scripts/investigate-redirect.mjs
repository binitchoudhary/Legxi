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
  console.log("=== HTTP REDIRECT CHAIN ===");
  try {
    let url = 'https://legxi.co/products/edition-1';
    let count = 0;
    while(count < 5) {
      const res = await fetch(url, { redirect: 'manual' });
      console.log(`[${res.status}] ${url}`);
      if (res.status >= 300 && res.status < 400) {
        let location = res.headers.get('location');
        console.log(`  -> Location: ${location}`);
        if (!location.startsWith('http')) {
           location = new URL(location, url).href;
        }
        url = location;
      } else {
        break;
      }
      count++;
    }
  } catch(e) {
    console.log("Error fetching HTTP chain", e);
  }

  console.log("\\n=== SHOPIFY URL REDIRECT OBJECTS ===");
  const q = `query {
    urlRedirects(first: 10, query: "path:/products/edition-1") {
      edges {
        node {
          id
          path
          target
        }
      }
    }
  }`;
  
  const data = await queryGraphQL(q);
  console.log(JSON.stringify(data, null, 2));
}

run();
