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
          descriptionHtml
          vendor
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
  const report = products.map(p => {
    const v = p.variants.edges[0]?.node || {};
    return {
      title: p.title,
      hasDescription: p.descriptionHtml && p.descriptionHtml.length > 10,
      brand: p.vendor,
      hasBarcode: !!v.barcode,
      hasSku: !!v.sku
    };
  });
  
  console.log(`Total Active Products Checked: ${products.length}`);
  console.log(`Missing Description: ${report.filter(p => !p.hasDescription).length}`);
  console.log(`Missing Barcode (GTIN): ${report.filter(p => !p.hasBarcode).length}`);
  
  // Show first 10 for sample
  console.log("\nSample of Missing Descriptions:");
  report.filter(p => !p.hasDescription).slice(0, 10).forEach(p => console.log(`- ${p.title} (Brand: ${p.brand}, GTIN: ${p.hasBarcode})`));
}

fetchProducts();
