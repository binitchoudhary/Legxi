import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const STORE = process.env.SHOPIFY_STORE;
const VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';

async function queryGraphQL(query) {
  try {
    const res = await fetch(`https://${STORE}/admin/api/${VERSION}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
      body: JSON.stringify({ query })
    });
    return (await res.json()).data;
  } catch (e) {
    console.error("GraphQL error:", e);
    return null;
  }
}

async function run() {
  console.log("=== STARTING FORENSIC DATA EXTRACTION ===");
  
  // 1. Get Shipping Profiles
  console.log("Fetching Delivery Profiles...");
  const shippingQuery = `query {
    deliveryProfiles(first: 10) {
      edges {
        node {
          name
          default
          profileLocationGroups {
            locationGroupZones(first: 50) {
              edges {
                node {
                  zone {
                    name
                    countries {
                      name
                    }
                  }
                  methodDefinitions(first: 20) {
                    edges {
                      node {
                        name
                        active
                        rateProvider {
                          __typename
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }`;
  
  const shippingData = await queryGraphQL(shippingQuery);
  fs.writeFileSync('shipping_data_raw.json', JSON.stringify(shippingData, null, 2));

  // 2. Get Products for GTIN and SEO Audit
  // Read NOT_APPROVED_PRODUCTS.csv and MISSING_PRODUCT_DETAILS.csv
  const artifactsDir = 'C:\\\\Users\\\\DELL\\\\.gemini\\\\antigravity-ide\\\\brain\\\\f56d1834-897a-499a-841c-81141b86a24a';
  
  console.log("Fetching product details...");
  // We'll just fetch a few of the latest products to simulate the audit since we don't have the exact parsed CSVs in this standalone script.
  // Actually, we can read the CSV we generated earlier!
  const csvPath = path.join(artifactsDir, 'NOT_APPROVED_PRODUCTS.csv');
  let pIds = new Set();
  
  if (fs.existsSync(csvPath)) {
    const lines = fs.readFileSync(csvPath, 'utf8').split('\\n');
    lines.forEach((l, i) => {
      if (i > 0 && l.trim()) {
        const cols = l.split(',');
        if (cols[1] && cols[1] !== 'N/A') pIds.add(cols[1]); // Shopify Product ID
      }
    });
  }
  
  const missingCsv = path.join(artifactsDir, 'MISSING_PRODUCT_DETAILS.csv');
  if (fs.existsSync(missingCsv)) {
    const lines = fs.readFileSync(missingCsv, 'utf8').split('\\n');
    lines.forEach((l, i) => {
      if (i > 0 && l.trim()) {
        const cols = l.split(',');
        if (cols[1] && cols[1] !== 'N/A') pIds.add(cols[1]); 
      }
    });
  }

  const pIdArray = Array.from(pIds).slice(0, 10); // Limit to 10 for deep audit extraction
  console.log(`Found ${pIds.size} unique products to audit. Extracting deep details for ${pIdArray.length}...`);

  const productData = [];
  for (const id of pIdArray) {
    const q = `query {
      product(id: "gid://shopify/Product/${id}") {
        id
        title
        handle
        descriptionHtml
        seo { title description }
        media(first: 10) {
          edges { node { ...on MediaImage { image { url altText width height } } } }
        }
        variants(first: 10) {
          edges {
            node {
              id
              title
              sku
              barcode
              price
            }
          }
        }
      }
    }`;
    const d = await queryGraphQL(q);
    if (d && d.product) {
      productData.push(d.product);
    }
  }

  fs.writeFileSync('product_audit_raw.json', JSON.stringify(productData, null, 2));
  console.log("Extraction complete.");
}

run().catch(console.error);
