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
  return (await res.json()).data;
}

async function check() {
  const handles = [
    'legxi-goat-collector-trio-set',
    'god-of-cricket-100-centuries-edition',
    'shreyas-iyer-hand-signed-white-gold-plated-artwork'
  ];
  
  for (const handle of handles) {
    const q = `
    query {
      productByHandle(handle: "${handle}") {
        title
        descriptionHtml
      }
    }`;
    const data = await fetchGraphQL(q);
    const prod = data?.productByHandle;
    if (prod) {
      console.log(`Product: ${prod.title}`);
      console.log(`Description Length: ${prod.descriptionHtml.length}`);
    } else {
      console.log(`Product ${handle} not found!`);
    }
  }
}
check();
