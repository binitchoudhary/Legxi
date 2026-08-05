import 'dotenv/config';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';
const GQL_URL = `https://${STORE}/admin/api/${VERSION}/graphql.json`;

async function fetchGraphQL(query, variables = {}) {
  const response = await fetch(GQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables })
  });
  return (await response.json()).data;
}

async function run() {
  console.log('\n--- 2. REDIRECT VALIDATION & CREATION ---');
  const redirects = [
    { src: '/products/la-scaloneta-2026-squad-slot-02', dest: '/products/la-scaloneta-squad-edition' },
    { src: '/products/la-scaloneta-2022-squad-slot-01', dest: '/products/la-scaloneta-squad-edition' },
    { src: '/products/la-scaloneta-2026-squad-slot-01', dest: '/products/la-scaloneta-squad-edition' },
    { src: '/products/edition-1', dest: '/products/arshdeep-x-legxi-as02-edition-cap' }
  ];

  for (const r of redirects) {
    console.log(`\nProcessing: ${r.src} -> ${r.dest}`);
    const srcRes = await fetch(`https://${STORE}${r.src}`, { redirect: 'manual' });
    if (srcRes.status === 301 || srcRes.status === 302) {
      console.log(`  Redirect ALREADY EXISTS pointing to: ${srcRes.headers.get('location')}`);
      continue;
    }
    
    // Create Redirect
    const redirectMut = `
      mutation urlRedirectCreate($urlRedirectToCreate: UrlRedirectInput!) {
        urlRedirectCreate(urlRedirectToCreate: $urlRedirectToCreate) {
          urlRedirect { id }
          userErrors { field message }
        }
      }
    `;
    const mutData = await fetchGraphQL(redirectMut, { urlRedirectToCreate: { path: r.src, target: r.dest } });
    if (mutData?.urlRedirectCreate?.userErrors?.length > 0) {
      console.log(`  Failed to create redirect:`, mutData.urlRedirectCreate.userErrors);
    } else {
      console.log(`  Redirect created successfully.`);
    }
  }
}

run().catch(console.error);
