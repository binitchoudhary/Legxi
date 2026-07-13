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
          title
          vendor
          productType
          tags
          variants(first: 1) {
            edges {
              node {
                sku
                barcode
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
    let classification = "";
    let reason = "";

    if (p.vendor === 'LEGXI' && !v.barcode) {
      classification = "identifier_exists = false";
      reason = "Store Brand / Custom Manufactured / No GS1 Barcode";
    } else if (v.barcode) {
      classification = "Compliant";
      reason = "GTIN provided";
    } else {
       classification = "Requires GTIN";
       reason = "Third-party manufactured product requires global identifier";
    }

    report.push({
      Title: p.title,
      Vendor: p.vendor,
      ProductType: p.productType || "None",
      SKU: v.sku || "Missing",
      Classification: classification,
      Reason: reason
    });
  });
  
  console.log(JSON.stringify(report, null, 2));
}

fetchProducts();
