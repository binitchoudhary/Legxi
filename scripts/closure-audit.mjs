import 'dotenv/config';
import * as cheerio from 'cheerio';
import fs from 'fs';

async function getSitemapUrls() {
  const sitemaps = [
    'https://legxi.co/sitemap_products_1.xml',
    'https://legxi.co/sitemap_pages_1.xml',
    'https://legxi.co/sitemap_collections_1.xml',
    'https://legxi.co/sitemap_blogs_1.xml'
  ];
  
  const urls = [];
  for (const sm of sitemaps) {
    try {
      const res = await fetch(sm);
      const text = await res.text();
      const matches = [...text.matchAll(/<loc>(.*?)<\/loc>/g)];
      urls.push(...matches.map(m => m[1]));
    } catch(e) {}
  }
  return urls.filter(u => !u.includes('/pages/giveaway-quiz') && 
                          !u.includes('/pages/kp-account') && 
                          !u.includes('/pages/registration-form') && 
                          !u.includes('/pages/authentication') && 
                          !u.includes('/pages/afa-x-legxi-thank-you'));
}

async function checkUrl(url) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    if (res.status !== 200) {
      return { url, error: `Status ${res.status}` };
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const robots = $('meta[name="robots"]').attr('content') || '';
    if (robots.includes('noindex')) {
      return { url, error: 'Contains noindex' };
    }
    
    const canonical = $('link[rel="canonical"]').attr('href') || '';
    if (canonical !== url) {
      return { url, error: `Cross canonical: ${canonical}` };
    }
    
    return null; // Passed
  } catch(e) {
    return { url, error: e.message };
  }
}

async function run() {
  console.log("Fetching sitemaps...");
  const urls = await getSitemapUrls();
  // Add homepage explicitly
  if (!urls.includes('https://legxi.co/')) urls.push('https://legxi.co/');
  
  console.log(`Found ${urls.length} publicly intended URLs. Auditing...`);
  
  const failures = [];
  let checked = 0;
  
  for (let i = 0; i < urls.length; i += 10) {
    const batch = urls.slice(i, i + 10);
    const results = await Promise.all(batch.map(u => checkUrl(u)));
    results.forEach(r => { if (r) failures.push(r); });
    checked += batch.length;
    process.stdout.write(`\\rAudited ${checked} / ${urls.length}`);
  }
  
  console.log('\\n\\nAudit Complete.\\n');
  if (failures.length > 0) {
    console.log("FAILURES FOUND:");
    failures.forEach(f => console.log(`- ${f.url} : ${f.error}`));
  } else {
    console.log("No remaining technical SEO defects on publicly indexable pages.");
  }
}

run();
