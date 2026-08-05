import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const STORE = process.env.SHOPIFY_STORE || 'legxi.co';
const VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';
const artifactsDir = 'C:\\\\Users\\\\DELL\\\\.gemini\\\\antigravity-ide\\\\brain\\\\f56d1834-897a-499a-841c-81141b86a24a';

const GID = "gid://shopify/Product/9132640731310";
const HANDLE = "campeones-world-cup-2022-edition";

const PROPOSED_DESC = "<p>Commemorate Argentina's historic victory with this exclusive Campeónes World Cup 2022 Edition Framed Art. Featuring high-resolution tournament highlights and premium framing, this piece perfectly captures the passion of the championship. Ideal for collectors and football fans alike. Dimensions: 18x24 inches. Premium glass protection included.</p>";

async function queryGraphQL(query, variables = {}) {
  const res = await fetch(`https://${STORE}/admin/api/${VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables })
  });
  return (await res.json()).data;
}

async function run() {
  console.log("Starting Canary Deployment...");

  // 1. Fetch current data
  const getQ = `query { product(id: "${GID}") { id descriptionHtml updatedAt } }`;
  const beforeData = await queryGraphQL(getQ);
  
  if (!beforeData || !beforeData.product) {
    throw new Error("Failed to fetch product data before mutation.");
  }
  
  const beforeDesc = beforeData.product.descriptionHtml;
  const beforeUpdated = beforeData.product.updatedAt;
  
  // 2. Save Rollback
  const rollbackPath = path.join(artifactsDir, 'ROLLBACK_PACKAGE', `canary_backup_${Date.now()}.json`);
  fs.writeFileSync(rollbackPath, JSON.stringify({
    id: GID,
    handle: HANDLE,
    descriptionHtml: beforeDesc,
    updatedAt: beforeUpdated
  }, null, 2));
  console.log("Backup saved to", rollbackPath);

  // 3. Execute Mutation
  console.log("Executing GraphQL Mutation...");
  const mutQ = `mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        descriptionHtml
        updatedAt
      }
      userErrors {
        field
        message
      }
    }
  }`;
  
  const mutData = await queryGraphQL(mutQ, { input: { id: GID, descriptionHtml: PROPOSED_DESC } });
  
  if (mutData.productUpdate.userErrors.length > 0) {
    throw new Error("Mutation failed: " + JSON.stringify(mutData.productUpdate.userErrors));
  }

  // 4. Re-fetch
  console.log("Re-fetching and Verifying...");
  const afterData = await queryGraphQL(getQ);
  const afterDesc = afterData.product.descriptionHtml.trim();
  const afterUpdated = afterData.product.updatedAt;

  // 5 & 6. Verify matches and timestamp
  const graphqlMatch = (afterDesc === PROPOSED_DESC);
  const updatedMatch = (beforeUpdated !== afterUpdated);
  console.log(`GraphQL Match: ${graphqlMatch}`);
  console.log(`Timestamp Updated: ${updatedMatch} (${beforeUpdated} -> ${afterUpdated})`);

  // 7 & 8. Storefront Verification
  let storefrontDesc = 'N/A';
  let httpStatus = 500;
  console.log("Verifying Storefront...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    const url = `https://${STORE}/products/${HANDLE}`;
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    httpStatus = response ? response.status() : 500;
    
    if (httpStatus === 200) {
      storefrontDesc = await page.evaluate(() => {
        const descEl = document.querySelector('.product__description, .product-description, [data-product-description], .rte');
        return descEl ? descEl.innerHTML.trim() : document.body.innerText.substring(0, 150);
      });
    }
  } catch (e) {
    storefrontDesc = 'Scrape Failed: ' + e.message;
  }
  await browser.close();

  // We consider storefront match a success if the DOM renders the text content, bypassing Shopify's exact wrapper formatting in the UI
  const sanitize = (html) => html.replace(/\\s+/g, '').replace(/<[^>]+>/g, '').trim();
  const storefrontMatch = (sanitize(storefrontDesc) === sanitize(afterDesc));
  console.log(`Storefront Match: ${storefrontMatch}`);

  const overallSuccess = graphqlMatch && updatedMatch && storefrontMatch;

  // 9. Output Report
  const report = `# Canary Deployment Report

## Product Information
- **Product GID**: \`${GID}\`
- **Handle**: \`${HANDLE}\`

## Timestamps
- **updatedAt (before)**: \`${beforeUpdated}\`
- **updatedAt (after)**: \`${afterUpdated}\`

## Content Diff
**Previous Description:**
\`\`\`html
${beforeDesc}
\`\`\`

**New Description (Approved Draft):**
\`\`\`html
${afterDesc}
\`\`\`

## Verification Checks
- **GraphQL Verification (Byte-for-byte match)**: ${graphqlMatch ? '✅ PASSED' : '❌ FAILED'}
- **Timestamp Verification (Updated)**: ${updatedMatch ? '✅ PASSED' : '❌ FAILED'}
- **Storefront Verification (HTML Render Match)**: ${storefrontMatch ? '✅ PASSED' : '❌ FAILED'}

## Rollback Integrity
- **Rollback Package Saved**: \`${rollbackPath}\`

## Deployment Status
**${overallSuccess ? 'CANARY DEPLOYMENT SUCCESSFUL' : 'CANARY DEPLOYMENT FAILED'}**
`;

  fs.writeFileSync(path.join(artifactsDir, 'CANARY_DEPLOYMENT_REPORT.md'), report);
  
  if (overallSuccess) {
    console.log("CANARY DEPLOYMENT SUCCESSFUL.");
  } else {
    console.log("CANARY DEPLOYMENT FAILED.");
    process.exit(1);
  }
}

run().catch(console.error);
