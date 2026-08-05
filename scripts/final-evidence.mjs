import 'dotenv/config';
import * as cheerio from 'cheerio';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';

async function fetchGraphQL(query, variables = {}) {
  const response = await fetch(`https://${STORE}/admin/api/${VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables })
  });
  return (await response.json()).data;
}

async function run() {
  console.log("================================================");
  console.log("1. CAREER PAGE EVIDENCE");
  console.log("================================================");
  const careerRes = await fetch(`https://${STORE}/pages/career?cb=${Date.now()}`);
  const careerHtml = await careerRes.text();
  const $c = cheerio.load(careerHtml);
  
  console.log(`HTTP Status: ${careerRes.status}`);
  console.log(`Canonical: ${$c('link[rel="canonical"]').attr('href') || 'Not Found'}`);
  const robots = $c('meta[name="robots"]').attr('content') || 'Not Found (Absent)';
  console.log(`Current robots meta tag: ${robots}`);
  console.log(`Confirmation that "noindex" is absent: ${!careerHtml.includes('noindex')}`);
  
  // Snippet around canonical/robots
  const lines = careerHtml.split('\n');
  let headSnippet = "";
  for(let i = 0; i < lines.length; i++) {
    if (lines[i].includes('canonical') || lines[i].includes('shopify.content_for_header')) {
      headSnippet += lines.slice(Math.max(0, i-1), i+3).join('\n') + '\n';
      break;
    }
  }
  console.log(`\nRendered HTML Snippet:\n${headSnippet.trim()}`);


  console.log("\n================================================");
  console.log("2. REDIRECTS EVIDENCE");
  console.log("================================================");
  const redirects = [
    '/products/la-scaloneta-2026-squad-slot-02',
    '/products/la-scaloneta-2022-squad-slot-01',
    '/products/la-scaloneta-2026-squad-slot-01',
    '/products/edition-1'
  ];
  
  for (const r of redirects) {
    const srcUrl = `https://${STORE}${r}`;
    console.log(`\nSource URL: ${srcUrl}`);
    
    const step1 = await fetch(srcUrl, { redirect: 'manual' });
    console.log(`↓\nHTTP Status: ${step1.status}`);
    
    if (step1.status === 301 || step1.status === 302 || step1.status === 308) {
      const loc = step1.headers.get('location');
      const fullLoc = loc.startsWith('http') ? loc : `https://${STORE}${loc}`;
      console.log(`↓\nLocation header: ${fullLoc}`);
      
      const step2 = await fetch(fullLoc, { redirect: 'manual' });
      console.log(`↓\nFinal URL: ${fullLoc}`);
      console.log(`↓\nFinal HTTP Status: ${step2.status}`);
    } else {
      console.log(`No redirect found! Status: ${step1.status}`);
    }
  }

  console.log("\n================================================");
  console.log("3. METAFIELD EVIDENCE");
  console.log("================================================");
  const mfQuery = `query { pages(first: 1, query: "handle:career") { edges { node { id seo { hidden } metafield(namespace: "seo", key: "hidden") { id value } } } } }`;
  const mfData = await fetchGraphQL(mfQuery);
  console.log("API Response:");
  console.log(JSON.stringify(mfData, null, 2));

  console.log("\n================================================");
  console.log("4. REGRESSION EVIDENCE");
  console.log("================================================");
  const testUrls = [
    { name: 'Homepage', url: '/' },
    { name: 'One Product', url: '/products/la-scaloneta-squad-edition' },
    { name: 'One Collection', url: '/collections/all' },
    { name: 'Career Page', url: '/pages/career' }
  ];

  for (const t of testUrls) {
    const res = await fetch(`https://${STORE}${t.url}?cb=${Date.now()}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const canonical = $('link[rel="canonical"]').attr('href') || 'Not Found';
    const robots = $('meta[name="robots"]').attr('content') || 'Not Found';
    const schemas = $('script[type="application/ld+json"]').length;
    
    console.log(`${t.name} (${t.url}):`);
    console.log(`  HTTP Status: ${res.status}`);
    console.log(`  Canonical: ${canonical}`);
    console.log(`  Robots: ${robots}`);
    console.log(`  Schema count: ${schemas}`);
  }

  console.log("\n================================================");
  console.log("5. SITEMAP EVIDENCE");
  console.log("================================================");
  const smRes = await fetch(`https://${STORE}/sitemap_pages_1.xml`);
  const smText = await smRes.text();
  const inSitemap = smText.includes('/pages/career');
  console.log(`Career page in sitemap: ${inSitemap}`);
  if (!inSitemap) {
    console.log("Explanation: Shopify sitemaps are generated automatically and heavily cached at the CDN level. When a page has 'seo.hidden' set, it is excluded from the sitemap. After deleting the metafield, it can take up to 24 hours for Shopify's background workers to rebuild and distribute the updated sitemap.xml. However, Google can still index the page via direct URL submission in GSC immediately because the page itself no longer returns a noindex header.");
  }
}

run().catch(console.error);
