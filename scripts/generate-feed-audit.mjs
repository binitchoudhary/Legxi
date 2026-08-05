import 'dotenv/config';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import path from 'path';

const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const STORE = process.env.SHOPIFY_STORE;
const VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';

const csvPath = 'c:\\\\Users\\\\DELL\\\\Downloads\\\\product_issues_2026-07-28_16-41-22.csv';
const artifactsDir = 'C:\\\\Users\\\\DELL\\\\.gemini\\\\antigravity-ide\\\\brain\\\\f56d1834-897a-499a-841c-81141b86a24a';

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function queryGraphQL(query) {
  try {
    const res = await fetch(`https://${STORE}/admin/api/${VERSION}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
      body: JSON.stringify({ query })
    });
    const json = await res.json();
    return json.data;
  } catch (e) {
    console.error("GraphQL error:", e);
    return null;
  }
}

function analyzeIssue(issueTitle) {
  const i = issueTitle.toLowerCase();
  let fix = {
    autoFixable: 'NO',
    recommendation: 'Manual review required',
    sourceField: 'Unknown',
    businessImpact: 'Medium',
    effort: 'Medium',
    missingAttribute: issueTitle,
    priority: 'P3'
  };

  if (i.includes('shipping')) {
    fix.autoFixable = 'NO';
    fix.recommendation = 'Update Shopify Shipping Profiles to match GMC country requirements';
    fix.sourceField = 'Settings > Shipping and delivery';
    fix.businessImpact = 'Critical - Blocks Sales';
    fix.effort = 'Low - Global config';
    fix.missingAttribute = 'Shipping Cost';
    fix.priority = 'P1';
  } else if (i.includes('description')) {
    fix.autoFixable = 'YES';
    fix.recommendation = 'Use AI API to generate detailed 150+ word SEO descriptions based on title/tags';
    fix.sourceField = 'Product Description (HTML)';
    fix.businessImpact = 'High - SEO Ranking & Visibility';
    fix.effort = 'Low - Can be fully automated';
    fix.missingAttribute = 'Description length/quality';
    fix.priority = 'P4';
  } else if (i.includes('gtin') || i.includes('identifier') || i.includes('barcode')) {
    fix.autoFixable = 'NO';
    fix.recommendation = 'Source valid GTIN/UPC from manufacturer or set custom product flag to true';
    fix.sourceField = 'Variant Barcode (GTIN)';
    fix.businessImpact = 'High - Blocks Free Listings';
    fix.effort = 'High - Data entry required';
    fix.missingAttribute = 'GTIN / MPN';
    fix.priority = 'P3';
  } else if (i.includes('image')) {
    fix.autoFixable = 'NO';
    fix.recommendation = 'Upload high-resolution images without promotional overlays';
    fix.sourceField = 'Product Media';
    fix.businessImpact = 'Critical - Blocks Sales';
    fix.effort = 'High - Asset creation';
    fix.missingAttribute = 'Image Link';
    fix.priority = 'P1';
  }
  return fix;
}

async function run() {
  console.log("Reading CSV...");
  const rawCsv = fs.readFileSync(csvPath, 'utf8');
  const records = parse(rawCsv, {
    columns: true,
    skip_empty_lines: true
  });

  console.log(`Found ${records.length} raw error rows.`);

  // Group by unique Product-Variant-Issue
  const uniqueIssues = new Map();
  for (const r of records) {
    const key = `${r['Item ID']}_${r['Issue title']}`;
    if (!uniqueIssues.has(key)) {
      uniqueIssues.set(key, r);
    }
  }
  
  console.log(`Collapsed into ${uniqueIssues.size} unique product-level issues.`);

  const notApproved = [];
  const limitedVis = [];
  const missingDetails = [];
  const unmatched = [];
  
  const productCache = new Map();
  
  let count = 0;
  for (const [key, r] of uniqueIssues) {
    count++;
    if (count % 20 === 0) console.log(`Processed ${count}/${uniqueIssues.size}...`);
    
    // Parse shopify_IN_9132640731310_47997074047150
    const parts = r['Item ID'].split('_');
    let pId = '', vId = '';
    if (parts.length >= 4 && parts[0] === 'shopify') {
      pId = parts[2];
      vId = parts[3];
    }
    
    let shopifyData = null;
    let matchError = '';
    
    if (!pId) {
      matchError = 'Invalid Item ID format';
    } else {
      if (!productCache.has(pId)) {
        // Query Shopify
        const q = `query {
          product(id: "gid://shopify/Product/${pId}") {
            id
            handle
            title
            status
            vendor
            collections(first: 3) { edges { node { title } } }
          }
        }`;
        const sData = await queryGraphQL(q);
        await delay(300); // Rate limit protection
        
        if (sData && sData.product) {
          productCache.set(pId, {
            title: sData.product.title,
            handle: sData.product.handle,
            status: sData.product.status,
            vendor: sData.product.vendor,
            collections: sData.product.collections.edges.map(e => e.node.title).join(', ')
          });
        } else {
          productCache.set(pId, null);
        }
      }
      shopifyData = productCache.get(pId);
      if (!shopifyData) matchError = 'Product not found in Shopify DB (Deleted or invalid ID)';
    }

    const analysis = analyzeIssue(r['Issue title']);
    
    // Re-evaluate priority based on row status
    if (r['Issue severity'] === 'SEVERITY_DISAPPROVED') analysis.priority = 'P1';
    else if (r['Item status'] === 'ELIGIBLE_LIMITED') analysis.priority = 'P2';
    else if (r['Issue severity'] === 'SEVERITY_DEMOTED') analysis.priority = 'P3';

    const rowOut = {
      'Product ID': r['Item ID'],
      'Shopify Product ID': pId || 'N/A',
      'Variant ID': vId || 'N/A',
      'Product Handle': shopifyData ? shopifyData.handle : 'N/A',
      'Product Title': shopifyData ? shopifyData.title : r['Title'],
      'Product Status': shopifyData ? shopifyData.status : 'N/A',
      'Vendor': shopifyData ? shopifyData.vendor : 'N/A',
      'Collection(s)': shopifyData ? shopifyData.collections : 'N/A',
      'Google Issue': r['Issue title'],
      'Exact Attribute Missing': analysis.missingAttribute,
      'Severity': r['Issue severity'] || r['Item status'],
      'Priority': analysis.priority,
      'Shopify Source Field': analysis.sourceField,
      'Recommended Fix': analysis.recommendation,
      'Can be auto-fixed?': analysis.autoFixable
    };

    if (matchError) {
      rowOut['Match Error'] = matchError;
      unmatched.push(rowOut);
      continue;
    }

    if (analysis.priority === 'P1') {
      notApproved.push(rowOut);
    } else if (analysis.priority === 'P2') {
      limitedVis.push(rowOut);
    } else {
      missingDetails.push(rowOut);
    }
  }

  // Write CSVs
  if (notApproved.length > 0) fs.writeFileSync(path.join(artifactsDir, 'NOT_APPROVED_PRODUCTS.csv'), stringify(notApproved, { header: true }));
  if (limitedVis.length > 0) fs.writeFileSync(path.join(artifactsDir, 'LIMITED_VISIBILITY_PRODUCTS.csv'), stringify(limitedVis, { header: true }));
  if (missingDetails.length > 0) fs.writeFileSync(path.join(artifactsDir, 'MISSING_PRODUCT_DETAILS.csv'), stringify(missingDetails, { header: true }));
  if (unmatched.length > 0) fs.writeFileSync(path.join(artifactsDir, 'UNMATCHED_PRODUCTS.csv'), stringify(unmatched, { header: true }));

  // Generate Remediation Plan
  const planLines = [
    '# Product Feed Remediation Plan',
    '',
    `## Audit Summary`,
    `- **P1 (Not Approved / Blocking Sales)**: ${notApproved.length} items`,
    `- **P2 (Limited Visibility)**: ${limitedVis.length} items`,
    `- **P3/P4 (Missing Details / Optimization)**: ${missingDetails.length} items`,
    `- **Unmatched (Deleted or Sync Errors)**: ${unmatched.length} items`,
    '',
    '## Issue Breakdown & Auto-Fix Viability',
    '| Priority | Google Issue | Auto-Fixable? | Recommendation | Shopify Field |',
    '|---|---|---|---|---|'
  ];

  const uniqueFixes = new Map();
  const allRows = [...notApproved, ...limitedVis, ...missingDetails];
  for (const r of allRows) {
    if (!uniqueFixes.has(r['Google Issue'])) {
      uniqueFixes.set(r['Google Issue'], r);
      planLines.push(`| ${r['Priority']} | ${r['Google Issue']} | ${r['Can be auto-fixed?']} | ${r['Recommended Fix']} | ${r['Shopify Source Field']} |`);
    }
  }

  planLines.push('');
  planLines.push('## Recommended Execution Order (Business Impact)');
  planLines.push('1. **[MANUAL] Global Shipping Profile**: Resolve the "Missing shipping costs" in Shopify Settings immediately as it affects P1 items. This is a global setting, not a per-product edit.');
  planLines.push('2. **[AUTOMATED] Description AI Enhancer**: Run a batch AI script to expand descriptions for products flagged for thin content. This will automatically clear P4 warnings and boost SEO.');
  planLines.push('3. **[MANUAL] GTIN / Barcode Sourcing**: Have the fulfillment team add valid GTINs to Shopify variants to clear P3/P2 warnings and enable Free Listings.');

  fs.writeFileSync(path.join(artifactsDir, 'PRODUCT_FEED_REMEDIATION_PLAN.md'), planLines.join('\\n'));
  
  console.log("Audit Complete! All artifacts generated.");
}

run().catch(console.error);
