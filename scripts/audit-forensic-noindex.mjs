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

const urls = fs.readFileSync('gsc_noindex_urls.txt', 'utf8')
  .split('\n')
  .map(u => u.replace(/^\d+\.\s*/, '').trim())
  .filter(Boolean);

async function run() {
  const results = [];
  for (const url of urls) {
    let type = 'unknown';
    let handle = '';
    
    if (url.includes('/products/')) {
      type = 'product';
      handle = url.split('/products/')[1].split('?')[0];
    } else if (url.includes('/pages/')) {
      type = 'page';
      handle = url.split('/pages/')[1].split('?')[0];
    } else if (url.includes('/blogs/')) {
      type = 'article';
      handle = url.split('/blogs/')[1].split('?')[0];
    }

    let reason = 'Unknown';
    let expected = false;
    let shouldIndex = true;
    let fixRequired = false;

    if (type === 'page') {
      if (['authentication', 'afa-x-legxi-thank-you'].includes(handle)) {
        reason = 'Theme logic: Hardcoded noindex_handles in fetched-layout-theme.liquid';
        expected = true;
        shouldIndex = false;
        fixRequired = false;
      } else if (handle === 'career') {
        reason = 'Theme logic: Hardcoded noindex_handles in fetched-layout-theme.liquid';
        expected = false;
        shouldIndex = true;
        fixRequired = true;
      }
    } else if (type === 'product') {
      const gql = `
        query getProduct($handle: String!) {
          productByHandle(handle: $handle) {
            id
            status
            seoHidden: metafield(namespace: "seo", key: "hidden") { value }
          }
        }
      `;
      const data = await fetchGraphQL(gql, { handle });
      if (data.productByHandle) {
        const product = data.productByHandle;
        if (product.seoHidden && product.seoHidden.value === '1') {
          reason = 'seo.hidden metafield is set to 1';
          expected = false;
          shouldIndex = true;
          fixRequired = true;
        } else if (product.status !== 'ACTIVE') {
           reason = `Product status is ${product.status}`;
           expected = true;
           shouldIndex = false;
           fixRequired = false;
        } else {
           reason = 'Cannot reproduce noindex via API. Could be a temporary issue or app injection.';
           expected = false;
           shouldIndex = true;
           fixRequired = true; // Requires deeper manual review
        }
      } else {
        reason = 'Product deleted (404)';
        expected = true;
        shouldIndex = false;
        fixRequired = false;
      }
    } else if (type === 'article' && url.includes('/tagged/')) {
       reason = 'Blog tag URL. Often canonicalized or noindexed by default Shopify logic or theme.';
       expected = true;
       shouldIndex = false;
       fixRequired = false;
    }

    results.push({ url, reason, expected, shouldIndex, fixRequired });
  }
  
  fs.writeFileSync('forensic_noindex_audit.json', JSON.stringify(results, null, 2));
  console.log('Noindex Audit Complete. Results saved to forensic_noindex_audit.json');
}

run().catch(console.error);
