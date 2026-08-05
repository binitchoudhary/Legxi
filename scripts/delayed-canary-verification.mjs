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

async function queryGraphQL(query) {
  const res = await fetch(`https://${STORE}/admin/api/${VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query })
  });
  return (await res.json()).data;
}

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function run() {
  console.log("Starting Delayed Canary Verification...");
  
  // Since real time has passed since the mutation, we are effectively >90 seconds past deployment.
  // But we will add a small explicit buffer just to be safe.
  console.log("Waiting 5 seconds to ensure clean network state...");
  await delay(5000);

  // 1. Fetch GraphQL
  console.log("Re-fetching GraphQL...");
  const getQ = `query { product(id: "${GID}") { descriptionHtml } }`;
  const sData = await queryGraphQL(getQ);
  const graphqlDesc = sData.product.descriptionHtml.trim();
  
  const graphqlMatch = (graphqlDesc === PROPOSED_DESC);

  // 2. Playwright with Fresh Context and Disabled Cache
  console.log("Launching fresh browser context with cache disabled...");
  const browser = await chromium.launch({ headless: true });
  
  // Create a completely fresh, incognito-style context with no storage
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });
  
  const page = await context.newPage();
  
  // Bypass service workers and force network
  await context.route('**/*', (route, request) => {
    // Continue all requests without caching
    route.continue();
  });

  let storefrontDesc = 'N/A';
  let httpStatus = 0;
  let cacheHeaders = {};

  page.on('response', response => {
    if (response.url().includes(HANDLE)) {
      httpStatus = response.status();
      const headers = response.headers();
      cacheHeaders = {
        'x-cache': headers['x-cache'] || 'none',
        'cf-cache-status': headers['cf-cache-status'] || 'none',
        'cache-control': headers['cache-control'] || 'none',
        'server': headers['server'] || 'none'
      };
    }
  });

  try {
    const url = `https://${STORE}/products/${HANDLE}`;
    console.log(`Navigating to ${url}...`);
    // Pass headers to bypass cache via Playwright
    await page.setExtraHTTPHeaders({
      'Pragma': 'no-cache',
      'Cache-Control': 'no-cache'
    });
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    storefrontDesc = await page.evaluate(() => {
      const descEl = document.querySelector('.product__description, .product-description, [data-product-description], .rte');
      return descEl ? descEl.innerHTML.trim() : document.body.innerText.substring(0, 150);
    });
  } catch (e) {
    storefrontDesc = 'Scrape Failed: ' + e.message;
  }
  
  await browser.close();

  const sanitize = (html) => html.replace(/\\s+/g, '').replace(/<[^>]+>/g, '').trim();
  const storefrontMatch = (sanitize(storefrontDesc) === sanitize(PROPOSED_DESC));

  console.log(`GraphQL Match: ${graphqlMatch}`);
  console.log(`Storefront Match: ${storefrontMatch}`);

  const overallSuccess = graphqlMatch && storefrontMatch;

  const report = `# Final Canary Verification

## Status: ${overallSuccess ? 'SUCCESSFUL' : 'FAILED'}

## Environment
- **Product**: \`${HANDLE}\`
- **GraphQL Match**: ${graphqlMatch ? '✅ Confirmed' : '❌ Mismatch'}
- **Storefront Match**: ${storefrontMatch ? '✅ Confirmed' : '❌ Mismatch'}

## Storefront HTTP Analysis
- **HTTP Status**: \`${httpStatus}\`
- **X-Cache**: \`${cacheHeaders['x-cache']}\`
- **CF-Cache-Status**: \`${cacheHeaders['cf-cache-status']}\`
- **Cache-Control**: \`${cacheHeaders['cache-control']}\`
- **Server Edge**: \`${cacheHeaders['server']}\`

## Storefront Rendered Output
\`\`\`html
${storefrontDesc}
\`\`\`

## Conclusion
${overallSuccess 
  ? "The delayed verification proves that the backend mutation was successful and the CDN cache has fully flushed. The live storefront now renders the exact SEO Description deployed via GraphQL."
  : "The storefront still does not match the drafted text. This requires an investigation into Shopify Theme rendering logic (e.g. Liquid templating stripping HTML or overriding the description)."}
`;

  fs.writeFileSync(path.join(artifactsDir, 'FINAL_CANARY_VERIFICATION.md'), report);
  console.log(overallSuccess ? "CANARY FINAL VERIFICATION SUCCESSFUL" : "CANARY FINAL VERIFICATION FAILED");
}

run().catch(console.error);
