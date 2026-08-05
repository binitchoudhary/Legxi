import fs from 'fs';
import xlsx from 'xlsx';
import * as cheerio from 'cheerio';
import http from 'http';
import https from 'https';
import { parse } from 'url';

const files = [
  { path: 'c:\\Users\\DELL\\Downloads\\legxi.co-Coverage-Drilldown-2026-07-28\\Table.csv', type: 'Alternative page with proper canonical tag', parser: 'csv' },
  { path: 'c:\\Users\\DELL\\Downloads\\legxi.co-Coverage-Drilldown-2026-07-28 (1)\\Table.csv', type: 'Blocked by robots.txt', parser: 'csv' },
  { path: 'c:\\Users\\DELL\\Downloads\\legxi.co-Coverage-Drilldown-2026-07-28 (2)\\Table.csv', type: 'Not found (404)', parser: 'csv' },
  { path: 'c:\\Users\\DELL\\Downloads\\legxi.co-Coverage-Drilldown-2026-07-28 (3)\\Table.csv', type: 'Page with redirect', parser: 'csv' },
  { path: 'c:\\Users\\DELL\\Downloads\\legxi.co-Coverage-Drilldown-2026-07-28.xlsx', type: 'Excluded by noindex tag', parser: 'xlsx' },
  { path: 'c:\\Users\\DELL\\Downloads\\legxi.co-Coverage-Drilldown-2026-07-28 (1).xlsx', type: 'Crawled not indexed', parser: 'xlsx' }
];

const sitemapUrls = new Set();
const internalLinks = new Set();
const productData = []; // for duplicate detection

async function fetchWithRedirectTrace(url, chain = []) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    chain.push(`${res.status}`);
    
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (loc) {
        const nextUrl = loc.startsWith('http') ? loc : new URL(loc, url).href;
        return await fetchWithRedirectTrace(nextUrl, chain);
      }
    }
    
    let html = '';
    if (res.status === 200) {
      html = await res.text();
    }
    
    return {
      status: res.status,
      chain: chain.join(' -> '),
      finalUrl: url,
      headers: {
        'cache-control': res.headers.get('cache-control') || '',
        'x-robots-tag': res.headers.get('x-robots-tag') || '',
        'content-type': res.headers.get('content-type') || ''
      },
      html
    };
  } catch (e) {
    return { status: 0, chain: 'Error', finalUrl: url, headers: {}, html: '' };
  }
}

async function populateSitemapAndLinks() {
  console.log("Fetching sitemaps and global links...");
  try {
    // 1. Sitemap
    const smRes = await fetch('https://legxi.co/sitemap.xml');
    const smHtml = await smRes.text();
    const childSitemaps = [...smHtml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
    for (const c of childSitemaps) {
       const cres = await fetch(c);
       const chtml = await cres.text();
       const urls = [...chtml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
       urls.forEach(u => sitemapUrls.add(u));
    }
    // 2. Links from Home & Collections
    const homeRes = await fetch('https://legxi.co/');
    const collRes = await fetch('https://legxi.co/collections/all');
    const $home = cheerio.load(await homeRes.text());
    const $coll = cheerio.load(await collRes.text());
    $home('a').each((_, el) => {
      const href = $home(el).attr('href');
      if (href) internalLinks.add(href.split('?')[0]);
    });
    $coll('a').each((_, el) => {
      const href = $coll(el).attr('href');
      if (href) internalLinks.add(href.split('?')[0]);
    });
  } catch (e) {
    console.error("Error populating sitemap:", e);
  }
}

async function auditUrl(urlObj) {
  const { url, type } = urlObj;
  
  const trace = await fetchWithRedirectTrace(url);
  const $ = cheerio.load(trace.html);
  
  const title = $('title').text().trim() || '';
  const desc = $('meta[name="description"]').attr('content') || '';
  const h1 = $('h1').first().text().trim().replace(/\\n/g, ' ') || '';
  
  // Structured Data
  let sd = { Product: 0, BreadcrumbList: 0, Organization: 0, CollectionPage: 0, FAQPage: 0, Article: 0 };
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html());
      const typeStr = JSON.stringify(json);
      if (typeStr.includes('Product')) sd.Product++;
      if (typeStr.includes('BreadcrumbList')) sd.BreadcrumbList++;
      if (typeStr.includes('Organization')) sd.Organization++;
      if (typeStr.includes('CollectionPage')) sd.CollectionPage++;
      if (typeStr.includes('FAQPage')) sd.FAQPage++;
      if (typeStr.includes('Article')) sd.Article++;
    } catch(e) {}
  });

  const canonicals = $('link[rel="canonical"]');
  let canonicalState = 'Missing';
  let canonicalUrl = '';
  if (canonicals.length > 1) {
    canonicalState = 'Multiple Canonicals';
    canonicalUrl = canonicals.first().attr('href');
  } else if (canonicals.length === 1) {
    canonicalUrl = canonicals.attr('href');
    canonicalState = (canonicalUrl === url || canonicalUrl === trace.finalUrl) ? 'Self Canonical' : 'Cross Canonical';
  }

  const robotsMeta = $('meta[name="robots"]').attr('content') || '';
  const isNoindex = robotsMeta.includes('noindex') || trace.headers['x-robots-tag'].includes('noindex');
  const isIndexable = !isNoindex && canonicalState === 'Self Canonical' && trace.status === 200;

  // Orphan
  const urlPath = new URL(url).pathname;
  let isOrphan = 'YES';
  if (sitemapUrls.has(url) || sitemapUrls.has(trace.finalUrl)) {
    isOrphan = 'NO';
  } else {
    for (const link of internalLinks) {
      if (link === urlPath || link === url) {
        isOrphan = 'NO';
        break;
      }
    }
  }
  const inSitemap = sitemapUrls.has(url) || sitemapUrls.has(trace.finalUrl) ? 'YES' : 'NO';

  // Word count
  const text = $('body').text().replace(/\\s+/g, ' ').trim();
  const wordCount = text.split(' ').length;
  
  productData.push({ url, title, desc, canonicalUrl, wordCount });

  // Classification logic
  let expectedBehaviour = 'NO';
  let rootCause = 'Unknown';
  let requiredFix = 'None';
  let classification = 'Requires No Action';
  let confidence = '90%';
  
  if (type === 'Alternative page with proper canonical tag') {
    if (canonicalState === 'Cross Canonical' && (url.includes('/collections/') || url.includes('?variant='))) {
      expectedBehaviour = 'YES';
      rootCause = 'Shopify Dynamic Routing';
      classification = 'Expected Shopify Behaviour';
      confidence = '100%';
    }
  } else if (type === 'Blocked by robots.txt') {
    if (url.includes('/search') || url.includes('?sort_by=') || url.includes('.atom') || url.includes('/checkouts') || url.includes('/cart')) {
      expectedBehaviour = 'YES';
      rootCause = 'Shopify Default Robots.txt';
      classification = 'Expected Shopify Behaviour';
      confidence = '100%';
    }
  } else if (type === 'Not found (404)') {
    if (trace.status === 301 || trace.status === 200) {
      expectedBehaviour = 'YES';
      rootCause = 'GSC Lag - Already Fixed';
      classification = 'Historical GSC Entry';
      confidence = '100%';
    } else {
      expectedBehaviour = 'NO';
      rootCause = 'Dead Link';
      requiredFix = 'Create 301 Redirect';
      classification = 'True Critical Issue';
      confidence = '100%';
    }
  } else if (type === 'Page with redirect') {
    if (trace.status === 200) {
       expectedBehaviour = 'NO';
       rootCause = 'GSC Lag - No longer redirects';
       classification = 'Historical GSC Entry';
       confidence = '95%';
    } else {
       expectedBehaviour = 'YES';
       rootCause = 'Permanent Shopify Redirect';
       classification = 'Expected Shopify Behaviour';
       confidence = '95%';
    }
  } else if (type === 'Excluded by noindex tag') {
    if (!isNoindex) {
      expectedBehaviour = 'YES';
      rootCause = 'GSC Lag - Metafield Deleted';
      classification = 'Historical GSC Entry';
      confidence = '100%';
    } else {
      // Business Intent Verification
      if (url.includes('/pages/kp-account') || url.includes('/pages/registration-form') || url.includes('/pages/authentication') || url.includes('/pages/giveaway-quiz')) {
        expectedBehaviour = 'YES';
        rootCause = 'Corporate/Utility Page';
        requiredFix = 'None - Do Not Index';
        classification = 'Private Utility Page';
        confidence = '100%';
      } else if (url.includes('/pages/afa-x-legxi-thank-you')) {
        expectedBehaviour = 'YES';
        rootCause = 'Post-Purchase Thank You';
        requiredFix = 'None - Do Not Index';
        classification = 'Conversion Funnel';
        confidence = '100%';
      } else if (url.includes('/products/legxi-goat-collector-trio-set') || url.includes('/products/god-of-cricket-100-centuries')) {
        expectedBehaviour = 'YES';
        rootCause = 'Hidden/Unlisted Product';
        requiredFix = 'None - Do Not Index';
        classification = 'Unlisted Product';
        confidence = '100%';
      } else {
        expectedBehaviour = 'NO';
        rootCause = 'Hardcoded or App Injection';
        requiredFix = 'Remove Noindex';
        classification = 'True Critical Issue';
        confidence = '100%';
      }
    }
  } else if (type === 'Crawled not indexed') {
    if (trace.status === 200 && isIndexable) {
       if (wordCount < 150) {
         expectedBehaviour = 'YES';
         rootCause = 'Thin Content';
         requiredFix = 'Add Unique Content';
         classification = 'Content Issue';
         confidence = '90%';
       } else {
         expectedBehaviour = 'NO';
         rootCause = 'Quality/Crawl Budget';
         requiredFix = 'Improve Internal Links';
         classification = 'Content Issue';
         confidence = '85%';
       }
    } else {
       expectedBehaviour = 'YES';
       rootCause = 'Not Indexable Now';
       classification = 'Historical GSC Entry';
       confidence = '90%';
    }
  }
  
  if (trace.chain.split('->').length > 2) {
    classification = 'True Critical Issue';
    rootCause = 'Redirect Chain';
    requiredFix = 'Flatten Redirects';
  }

  return {
    URL: url,
    'Issue Type': type,
    'Current HTTP Status': trace.status,
    Canonical: canonicalState,
    Robots: robotsMeta || trace.headers['x-robots-tag'] || 'None',
    Indexable: isIndexable ? 'YES' : 'NO',
    'Expected Behaviour': expectedBehaviour,
    'Root Cause': rootCause,
    'Required Fix': requiredFix,
    'Confidence %': confidence,
    Classification: classification,
    'Cache-Control': trace.headers['cache-control'],
    'Content-Type': trace.headers['content-type'],
    Title: `"${title.replace(/"/g, '""')}"`,
    'Meta Description': `"${desc.replace(/"/g, '""')}"`,
    H1: `"${h1.replace(/"/g, '""')}"`,
    'SD-Product': sd.Product,
    'SD-Breadcrumb': sd.BreadcrumbList,
    'SD-Organization': sd.Organization,
    'SD-Collection': sd.CollectionPage,
    'SD-FAQ': sd.FAQPage,
    'SD-Article': sd.Article,
    Orphan: isOrphan,
    Sitemap: inSitemap,
    'Redirect Chain': trace.chain
  };
}

async function run() {
  await populateSitemapAndLinks();
  
  const allUrls = [];
  
  for (const f of files) {
    if (f.parser === 'csv') {
      const text = fs.readFileSync(f.path, 'utf8');
      const lines = text.split('\\n');
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const url = lines[i].split(',')[0];
        if (url.startsWith('http')) allUrls.push({ url, type: f.type });
      }
    } else {
      const wb = xlsx.readFile(f.path);
      const sheet = wb.Sheets[wb.SheetNames[1]]; // Table data
      const data = xlsx.utils.sheet_to_json(sheet);
      data.forEach(row => {
        if (row.URL) allUrls.push({ url: row.URL, type: f.type });
      });
    }
  }
  
  console.log(`Loaded ${allUrls.length} URLs for auditing...`);
  
  const results = [];
  
  // Concurrent batch processing (5 at a time)
  for (let i = 0; i < allUrls.length; i += 5) {
    const batch = allUrls.slice(i, i + 5);
    const promises = batch.map(u => auditUrl(u));
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
    process.stdout.write(`\\rProcessed ${results.length} / ${allUrls.length}`);
  }
  console.log('\\nCalculating Duplicates...');
  
  // Duplicate Detection
  results.forEach(res => {
    const pd = productData.find(p => p.url === res.URL);
    let dupRisk = 'Low';
    if (pd) {
      const sames = productData.filter(p => p.title === pd.title && p.url !== pd.url && p.title.length > 0);
      if (sames.length > 0) {
         if (res.Canonical === 'Self Canonical') dupRisk = 'High';
         else dupRisk = 'Medium';
      }
    }
    res['Duplicate Risk'] = dupRisk;
  });
  
  // Output CSV
  const header = ['URL', 'Issue Type', 'Current HTTP Status', 'Canonical', 'Robots', 'Indexable', 'Expected Behaviour', 'Root Cause', 'Required Fix', 'Confidence %', 'Classification', 'Cache-Control', 'Content-Type', 'Title', 'Meta Description', 'H1', 'SD-Product', 'SD-Breadcrumb', 'SD-Organization', 'SD-Collection', 'SD-FAQ', 'SD-Article', 'Orphan', 'Sitemap', 'Redirect Chain', 'Duplicate Risk'];
  
  const csvContent = [
    header.join(','),
    ...results.map(r => header.map(h => `${r[h]}`).join(','))
  ].join('\\n');
  
  fs.writeFileSync('C:\\\\Users\\\\DELL\\\\.gemini\\\\antigravity-ide\\\\brain\\\\f56d1834-897a-499a-841c-81141b86a24a\\\\seo_forensic_audit.csv', csvContent);
  
  // Generating Summaries
  let c_200=0, c_301=0, c_302=0, c_404=0, c_410=0, c_self=0, c_cross=0, c_noindex=0, c_rob=0, c_orph=0, c_thin=0, c_dup=0, c_hist=0, c_fp=0, c_defects=0;
  let c_priv=0, c_conv=0, c_unl=0;
  
  results.forEach(r => {
    if (r['Current HTTP Status'] == 200) c_200++;
    if (r['Current HTTP Status'] == 301) c_301++;
    if (r['Current HTTP Status'] == 302) c_302++;
    if (r['Current HTTP Status'] == 404) c_404++;
    if (r['Current HTTP Status'] == 410) c_410++;
    if (r.Canonical === 'Self Canonical') c_self++;
    if (r.Canonical === 'Cross Canonical') c_cross++;
    if (r.Robots.includes('noindex')) c_noindex++;
    if (r['Issue Type'] === 'Blocked by robots.txt') c_rob++;
    if (r.Orphan === 'YES') c_orph++;
    if (r['Root Cause'] === 'Thin Content') c_thin++;
    if (r['Duplicate Risk'] === 'High') c_dup++;
    if (r.Classification === 'Historical GSC Entry') c_hist++;
    if (r.Classification === 'Expected Shopify Behaviour') c_fp++;
    if (r.Classification === 'True Critical Issue') c_defects++;
    if (r.Classification === 'Private Utility Page') c_priv++;
    if (r.Classification === 'Conversion Funnel') c_conv++;
    if (r.Classification === 'Unlisted Product') c_unl++;
  });
  
  const summaryMd = `
# SEO Forensic Summary

- Total URLs Audited: ${results.length}
- 200: ${c_200}
- 301: ${c_301}
- 302: ${c_302}
- 404: ${c_404}
- 410: ${c_410}
- Self Canonicals: ${c_self}
- Cross Canonicals: ${c_cross}
- Noindex: ${c_noindex}
- Robots Blocked: ${c_rob}
- Orphan Pages: ${c_orph}
- Thin Content: ${c_thin}
- Duplicate Content: ${c_dup}

**Classification Breakdown**
- Historical GSC URLs: ${c_hist}
- False Positives (Expected Shopify): ${c_fp}
- Intentional Business Exclusions: ${c_priv + c_conv + c_unl}
  - Private Utility Pages: ${c_priv}
  - Conversion Funnels: ${c_conv}
  - Unlisted Products: ${c_unl}
- Real SEO Defects: ${c_defects}
`;
  fs.writeFileSync('C:\\\\Users\\\\DELL\\\\.gemini\\\\antigravity-ide\\\\brain\\\\f56d1834-897a-499a-841c-81141b86a24a\\\\seo_forensic_summary.md', summaryMd);
  
  const critical = results.filter(r => r.Classification === 'True Critical Issue');
  fs.writeFileSync('C:\\\\Users\\\\DELL\\\\.gemini\\\\antigravity-ide\\\\brain\\\\f56d1834-897a-499a-841c-81141b86a24a\\\\critical_action_items.md', critical.length > 0 ? JSON.stringify(critical, null, 2) : 'No true critical issues remaining.');
  
  const deployment = results.filter(r => r.Classification === 'Requires Deployment');
  fs.writeFileSync('C:\\\\Users\\\\DELL\\\\.gemini\\\\antigravity-ide\\\\brain\\\\f56d1834-897a-499a-841c-81141b86a24a\\\\deployment_required.md', deployment.length > 0 ? JSON.stringify(deployment, null, 2) : 'No URLs require deployment changes.');

  console.log("Audit Complete.");
}

run();
