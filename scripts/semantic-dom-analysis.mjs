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

async function queryGraphQL(query) {
  const res = await fetch(`https://${STORE}/admin/api/${VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query })
  });
  return (await res.json()).data;
}

async function run() {
  console.log("Starting Semantic DOM Analysis...");
  
  // 1. Fetch exact GraphQL text
  const getQ = `query { product(id: "${GID}") { descriptionHtml } }`;
  const sData = await queryGraphQL(getQ);
  const graphqlDesc = sData.product.descriptionHtml.trim();
  const rawTextMatch = graphqlDesc.replace(/<[^>]+>/g, '').substring(0, 50).trim(); // First 50 chars for semantic matching

  console.log(`Targeting semantic text signature: "${rawTextMatch}"`);

  // 2. Playwright Analysis
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const url = `https://${STORE}/products/${HANDLE}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

  const analysis = await page.evaluate(({ graphqlDesc, rawTextMatch }) => {
    const result = {
      jsonLdDescription: null,
      selector: null,
      xpath: null,
      outerHtml: null,
      visibleText: null,
      hiddenReason: null
    };

    // 1. Parse JSON-LD
    const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (let script of ldScripts) {
      try {
        const json = JSON.parse(script.innerText);
        // Sometimes it's an array
        const items = Array.isArray(json) ? json : [json];
        for (let item of items) {
          if (item['@type'] === 'Product' && item.description) {
            result.jsonLdDescription = item.description;
          }
        }
      } catch (e) {}
    }

    // 2. Find Semantic Match in DOM
    const allElements = document.querySelectorAll('body *');
    let bestMatch = null;

    // Find the deepest element that contains the target semantic text
    for (let el of allElements) {
      // Skip script/style tags
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'NOSCRIPT') continue;
      
      const text = el.innerText || '';
      if (text.includes(rawTextMatch)) {
        // If it's a leaf node or contains the text directly
        bestMatch = el;
      }
    }

    if (bestMatch) {
      // Generate CSS selector
      let path = [];
      let current = bestMatch;
      while (current && current.tagName !== 'HTML') {
        let selector = current.tagName.toLowerCase();
        if (current.id) {
          selector += '#' + current.id;
          path.unshift(selector);
          break; // IDs are unique
        } else if (current.className) {
          // just use the first stable class
          const classes = Array.from(current.classList).filter(c => !c.includes(':') && !c.includes('js-'));
          if (classes.length > 0) {
            selector += '.' + classes.join('.');
          }
        }
        path.unshift(selector);
        current = current.parentElement;
      }
      result.selector = path.join(' > ');

      // Generate XPath
      const getXPath = (el) => {
        if (el.id !== '') return `id("${el.id}")`;
        if (el === document.body) return el.tagName;
        let ix = 0;
        let siblings = el.parentNode.childNodes;
        for (let i = 0; i < siblings.length; i++) {
          let sibling = siblings[i];
          if (sibling === el) return getXPath(el.parentNode) + '/' + el.tagName + '[' + (ix + 1) + ']';
          if (sibling.nodeType === 1 && sibling.tagName === el.tagName) ix++;
        }
      };
      result.xpath = getXPath(bestMatch);
      result.outerHtml = bestMatch.outerHTML;
      result.visibleText = bestMatch.innerText;
      
      // Check visibility
      const style = window.getComputedStyle(bestMatch);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        result.hiddenReason = 'Theme CSS hides the container (' + style.display + ')';
      }
    } else {
      // Check shadow DOMs
      const shadowHosts = document.querySelectorAll('*');
      for (let host of shadowHosts) {
        if (host.shadowRoot && host.shadowRoot.innerHTML.includes(rawTextMatch)) {
          result.hiddenReason = 'Inside Shadow DOM component: ' + host.tagName;
        }
      }
      if (!result.hiddenReason) {
        result.hiddenReason = 'Not rendered on page. Likely conditionally excluded by Liquid template or requires user interaction (e.g. Accordion/Tab).';
      }
    }

    return result;
  }, { graphqlDesc, rawTextMatch });

  await browser.close();
  
  // Format the output
  const sanitize = (text) => (text || '').replace(/\\s+/g, '').replace(/<[^>]+>/g, '').trim();
  const gClean = sanitize(graphqlDesc);
  const rClean = sanitize(analysis.visibleText);
  const match = (gClean === rClean) && gClean.length > 0;

  const report = `# Frontend Selector Semantic Analysis

## Execution Details
- **Product Handle**: \`${HANDLE}\`
- **GraphQL Semantic Target**: \`${rawTextMatch}\`

## 1. JSON-LD Structured Data
- **Detected Product Description**: ${analysis.jsonLdDescription ? '\`' + analysis.jsonLdDescription + '\`' : '*None found*'}
- **Validation**: ${analysis.jsonLdDescription && sanitize(analysis.jsonLdDescription) === gClean ? '✅ Matches GraphQL' : '❌ Mismatch / Missing'}

## 2. DOM Rendering Analysis
${analysis.selector ? `
- **Theme CSS Selector Used**: \`${analysis.selector}\`
- **XPath**: \`${analysis.xpath}\`
- **Is Selector Stable**: ${analysis.selector.includes('shopify-section') ? 'YES' : 'NO (Depends on dynamic classes)'}
- **Recommended Long-Term Selector**: \`${analysis.selector.split(' > ').slice(-2).join(' > ')}\`

### Outer HTML Rendered
\`\`\`html
${analysis.outerHtml.substring(0, 500)}...
\`\`\`

### Visible Text
\`\`\`text
${analysis.visibleText}
\`\`\`
` : `
- **Theme Rendering Status**: ❌ Rendered text not found in standard DOM.
- **Root Cause Investigation**: ${analysis.hiddenReason}
`}

## 3. Final Verification
- **GraphQL vs Rendered Comparison**: ${match ? '✅ Perfect Byte-for-Byte Render' : '❌ Mismatch'}
- **Final Status**: **${match ? 'PASS' : 'FAIL'}**
`;

  fs.writeFileSync(path.join(artifactsDir, 'FRONTEND_SELECTOR_ANALYSIS.md'), report);
  console.log("Analysis written to FRONTEND_SELECTOR_ANALYSIS.md");
}

run().catch(console.error);
