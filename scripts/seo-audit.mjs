import 'dotenv/config';
import ExcelJS from 'exceljs';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';
const BASE_URL = `https://${STORE}/admin/api/${VERSION}/graphql.json`;

async function fetchGraphQL(query, variables = {}) {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN,
    },
    body: JSON.stringify({ query, variables })
  });
  const data = await response.json();
  if (data.errors) {
    throw new Error(JSON.stringify(data.errors));
  }
  return data.data;
}

const GET_PRODUCTS = `
query GetProducts($cursor: String) {
  products(first: 250, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    edges {
      node {
        id title handle status
        seo { title description }
        metafield(namespace: "judgeme", key: "badge") { value }
      }
    }
  }
}`;

const GET_COLLECTIONS = `
query GetCollections($cursor: String) {
  collections(first: 250, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    edges {
      node {
        id title handle
        seo { title description }
      }
    }
  }
}`;

const GET_ARTICLES = `
query GetArticles($cursor: String) {
  articles(first: 250, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    edges {
      node {
        id title handle
        seoTitle: metafield(namespace: "global", key: "title_tag") { value }
        seoDescription: metafield(namespace: "global", key: "description_tag") { value }
      }
    }
  }
}`;

const GET_PAGES = `
query GetPages($cursor: String) {
  pages(first: 250, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    edges {
      node {
        id title handle
        seoTitle: metafield(namespace: "global", key: "title_tag") { value }
        seoDescription: metafield(namespace: "global", key: "description_tag") { value }
      }
    }
  }
}`;

async function fetchAll(queryName, query) {
  let hasNext = true;
  let cursor = null;
  const results = [];
  while (hasNext) {
    const data = await fetchGraphQL(query, { cursor });
    const connection = data[queryName];
    results.push(...connection.edges.map(e => e.node));
    hasNext = connection.pageInfo.hasNextPage;
    cursor = connection.pageInfo.endCursor;
  }
  return results;
}

async function runAudit() {
  console.log('Fetching Products...');
  const products = await fetchAll('products', GET_PRODUCTS);
  console.log('Fetching Collections...');
  const collections = await fetchAll('collections', GET_COLLECTIONS);
  console.log('Fetching Blogs/Articles...');
  const articles = await fetchAll('articles', GET_ARTICLES);
  console.log('Fetching Pages...');
  const pages = await fetchAll('pages', GET_PAGES);

  const allUrls = [];
  let judgemeActive = false;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('SEO Audit');
  
  sheet.columns = [
    { header: 'Type', key: 'type', width: 15 },
    { header: 'Title', key: 'title', width: 40 },
    { header: 'Handle', key: 'handle', width: 40 },
    { header: 'SEO Title', key: 'seoTitle', width: 50 },
    { header: 'SEO Description', key: 'seoDesc', width: 60 },
    { header: 'Issue', key: 'issue', width: 30 }
  ];

  const checkIssues = (node, type) => {
    let issue = [];
    const st = node.seo?.title || node.seoTitle?.value;
    const sd = node.seo?.description || node.seoDescription?.value;
    
    if (['frontpage', 'index', 'home'].includes(node.handle?.toLowerCase())) return 'Homepage (Excluded from checks)';

    if (!st || st.trim() === '') issue.push('Missing Meta Title');
    if (!sd || sd.trim() === '') issue.push('Missing Meta Description');
    if (type === 'Product' && node.status !== 'ACTIVE') issue.push('Not Active');
    
    if (type === 'Product' && node.metafield?.value) judgemeActive = true;
    
    // Duplicate check
    const duplicateTitle = allUrls.find(u => u.seoTitle === st && st !== null && st.trim() !== '');
    if (duplicateTitle) issue.push('Duplicate Title');

    const duplicateDesc = allUrls.find(u => u.seoDesc === sd && sd !== null && sd.trim() !== '');
    if (duplicateDesc) issue.push('Duplicate Description');

    allUrls.push({ type, title: node.title, seoTitle: st, seoDesc: sd });
    
    return issue.join(', ') || 'None';
  };

  products.forEach(p => sheet.addRow({ type: 'Product', title: p.title, handle: p.handle, seoTitle: p.seo?.title, seoDesc: p.seo?.description, issue: checkIssues(p, 'Product') }));
  collections.forEach(c => sheet.addRow({ type: 'Collection', title: c.title, handle: c.handle, seoTitle: c.seo?.title, seoDesc: c.seo?.description, issue: checkIssues(c, 'Collection') }));
  articles.forEach(a => sheet.addRow({ type: 'Article', title: a.title, handle: a.handle, seoTitle: a.seoTitle?.value, seoDesc: a.seoDescription?.value, issue: checkIssues(a, 'Article') }));
  pages.forEach(p => sheet.addRow({ type: 'Page', title: p.title, handle: p.handle, seoTitle: p.seoTitle?.value, seoDesc: p.seoDescription?.value, issue: checkIssues(p, 'Page') }));

  const reportPath = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\7ebe8814-5716-4c3c-a481-5c7e4037d6b0\\seo-audit-report.xlsx';
  await workbook.xlsx.writeFile(reportPath);
  console.log(`\\nAudit Complete! Saved to ${reportPath}`);
  
  console.log('\\n--- Judge.me Verification ---');
  console.log(`Judge.me Reviews Detected in Product Metafields: ${judgemeActive}`);
}

runAudit().catch(console.error);
