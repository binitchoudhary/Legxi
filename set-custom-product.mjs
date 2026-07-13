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
  return await res.json();
}

async function run() {
  let hasNext = true;
  let cursor = null;
  let customCount = 0;
  
  while(hasNext) {
    const query = `
    query($cursor: String) {
      products(first: 50, after: $cursor, query: "status:ACTIVE") {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            title
            variants(first: 1) {
              edges {
                node {
                  barcode
                }
              }
            }
          }
        }
      }
    }`;
    
    const data = await fetchGraphQL(query, { cursor });
    if (data.errors) break;
    
    for (const edge of data.data.products.edges) {
      const p = edge.node;
      const barcode = p.variants.edges[0]?.node?.barcode;
      
      // If no barcode (GTIN), it's a custom product
      if (!barcode || barcode.trim() === '') {
        const mutation = `
        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            userErrors { field message }
          }
        }`;
        
        // Shopify Google channel uses mm-google-shopping.custom_product
        const variables = {
          metafields: [{
            ownerId: p.id,
            namespace: "mm-google-shopping",
            key: "custom_product",
            type: "boolean",
            value: "true"
          }]
        };
        
        const mData = await fetchGraphQL(mutation, variables);
        if (!mData.data?.metafieldsSet?.userErrors?.length) {
          customCount++;
          console.log(`Set custom_product=true for: ${p.title}`);
        }
      }
    }
    
    hasNext = data.data.products.pageInfo.hasNextPage;
    cursor = data.data.products.pageInfo.endCursor;
  }
  
  console.log(`\nSuccessfully marked ${customCount} custom products for Merchant Center.`);
}

run();
