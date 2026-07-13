import 'dotenv/config';
const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';
const H = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

async function fetchProducts() {
  const query = `
  query {
    products(first: 50, query: "status:ACTIVE") {
      edges {
        node {
          id
          title
          vendor
          tags
          variants(first: 1) {
            edges {
              node {
                barcode
                sku
                price
              }
            }
          }
        }
      }
    }
  }`;
  
  const res = await fetch(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  const products = data.data.products.edges.map(e => e.node);
  
  const report = [];
  products.forEach(p => {
    const v = p.variants.edges[0]?.node || {};
    const isSigned = p.title.toLowerCase().includes('signed') || p.title.toLowerCase().includes('signature') || p.tags.includes('Signed');
    report.push({
      Title: p.title,
      Brand: p.vendor,
      GTIN: v.barcode ? 'Yes' : 'No',
      Category: isSigned ? 'Custom Collectible' : 'Standard Product',
      GTIN_Action: isSigned && !v.barcode ? 'identifier_exists = false' : (v.barcode ? 'Compliant' : 'Add GTIN')
    });
  });
  
  console.log(JSON.stringify(report, null, 2));
}

fetchProducts();
