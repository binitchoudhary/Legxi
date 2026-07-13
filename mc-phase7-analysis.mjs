import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';

const csv = readFileSync('C:\\Users\\dell\\Downloads\\product_issues_2026-07-06_18-07-43.csv', 'utf8');
const lines = csv.split('\n');
const headers = lines[0].split(',');

// Parse CSV properly
function parseCSVLine(line) {
  const cols = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { cols.push(current); current = ''; }
    else { current += char; }
  }
  cols.push(current);
  return cols;
}

const issues = {};
const productIssues = {};

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  const cols = parseCSVLine(line);
  if (cols.length < 9) continue;

  const itemId = cols[0];
  const title = cols[1];
  const feedLabel = cols[3];
  const issueTitle = cols[7];
  const issueMsg = cols[8];
  const channel = cols[9];
  const country = cols[10];
  const severity = cols[11];

  const key = `${itemId}`;
  if (!issues[issueTitle]) issues[issueTitle] = { count: 0, uniqueProducts: new Set(), details: [] };
  issues[issueTitle].count++;
  issues[issueTitle].uniqueProducts.add(key);

  if (!productIssues[key]) productIssues[key] = { title, feedLabel, issues: [] };
  productIssues[key].issues.push({ issueTitle, issueMsg, channel, country, severity });
}

console.log('=== MERCHANT CENTER DIAGNOSTICS SUMMARY ===');
for (const [title, data] of Object.entries(issues)) {
  console.log(`\n--- ${title} ---`);
  console.log(`Total rows: ${data.count}`);
  console.log(`Unique products: ${data.uniqueProducts.size}`);
}

// Check feed labels for shipping issue
console.log('\n\n=== SHIPPING ISSUE FEED ANALYSIS ===');
const shippingProducts = new Set();
for (const [pid, data] of Object.entries(productIssues)) {
  const hasShipping = data.issues.some(i => i.issueTitle.includes('shipping'));
  if (hasShipping) {
    shippingProducts.add(pid);
    if (shippingProducts.size <= 3) {
      console.log(`${pid} | Feed: ${data.feedLabel} | ${data.title}`);
    }
  }
}
console.log(`Total products with shipping issues: ${shippingProducts.size}`);

// Check feed labels for each issue
console.log('\n\n=== FEED LABEL DISTRIBUTION ===');
const feedLabels = {};
for (const [pid, data] of Object.entries(productIssues)) {
  const fl = data.feedLabel;
  if (!feedLabels[fl]) feedLabels[fl] = {};
  for (const issue of data.issues) {
    if (!feedLabels[fl][issue.issueTitle]) feedLabels[fl][issue.issueTitle] = new Set();
    feedLabels[fl][issue.issueTitle].add(pid);
  }
}
for (const [fl, issueData] of Object.entries(feedLabels)) {
  console.log(`\nFeed: ${fl}`);
  for (const [issue, prods] of Object.entries(issueData)) {
    console.log(`  ${issue}: ${prods.size} unique products`);
  }
}

// Invalid price products
console.log('\n\n=== INVALID PRICE PRODUCTS ===');
const invalidPriceProds = Object.entries(productIssues).filter(([_, d]) => d.issues.some(i => i.issueTitle === 'Invalid price'));
for (const [pid, data] of invalidPriceProds) {
  console.log(`${pid} | ${data.title}`);
}

// Unsupported image products
console.log('\n\n=== UNSUPPORTED IMAGE PRODUCTS ===');
const imgProds = Object.entries(productIssues).filter(([_, d]) => d.issues.some(i => i.issueTitle.includes('image')));
for (const [pid, data] of imgProds) {
  console.log(`${pid} | ${data.title}`);
}

writeFileSync('C:\\Users\\dell\\Desktop\\legxi\\phase7-analysis.json', JSON.stringify({
  issueSummary: Object.fromEntries(Object.entries(issues).map(([k, v]) => [k, { totalRows: v.count, uniqueProducts: v.uniqueProducts.size }])),
  feedLabels,
  invalidPriceProducts: invalidPriceProds.map(([pid, d]) => ({ id: pid, title: d.title })),
  unsupportedImageProducts: imgProds.map(([pid, d]) => ({ id: pid, title: d.title })),
}, null, 2));

console.log('\n\nAnalysis saved to phase7-analysis.json');
