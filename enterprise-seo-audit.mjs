import fs from 'fs';

async function fetchPage(url) {
  try {
    console.log(`Fetching: ${url}`);
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 SEO Audit Bot' } });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const html = await res.text();
    return html;
  } catch(e) {
    return { error: e.message };
  }
}

function parseHTML(html, url) {
  const result = { url };
  
  // Title
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  result.title = titleMatch ? titleMatch[1].trim() : null;
  
  // Meta Description
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i);
  result.metaDescription = descMatch ? descMatch[1].trim() : null;
  
  // H1
  const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  result.h1Count = h1Matches.length;
  result.h1s = h1Matches.map(h => h.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
  
  // H2 Count
  result.h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
  
  // Images
  const imgTags = html.match(/<img[^>]+>/gi) || [];
  result.totalImages = imgTags.length;
  result.lazyImages = imgTags.filter(img => /loading=["']lazy["']/i.test(img)).length;
  result.missingAlt = imgTags.filter(img => !/alt=["'][^"']*["']/i.test(img)).length;
  
  // Scripts (Render blocking)
  const scriptTags = html.match(/<script[^>]+>/gi) || [];
  result.totalScripts = scriptTags.length;
  result.asyncDeferScripts = scriptTags.filter(s => /async|defer/i.test(s)).length;
  
  // Links
  const aTags = html.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi) || [];
  result.totalLinks = aTags.length;
  
  // Schemas
  result.schemas = [];
  const schemaRegex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = schemaRegex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1]);
      if (Array.isArray(json)) {
        json.forEach(j => result.schemas.push(j['@type']));
      } else {
        result.schemas.push(json['@type']);
      }
    } catch(e) {}
  }
  
  return result;
}

async function main() {
  const urls = [
    'https://legxi.co/',
    'https://legxi.co/products/legxi-champions-trinity-set-1',
    'https://legxi.co/collections/all',
    'https://legxi.co/blogs/news'
  ];
  
  const report = [];
  for (const url of urls) {
    const html = await fetchPage(url);
    if (html.error) {
      report.push({ url, error: html.error });
    } else {
      report.push(parseHTML(html, url));
    }
  }
  
  fs.writeFileSync('seo-audit-results.json', JSON.stringify(report, null, 2));
  console.log('Saved to seo-audit-results.json');
}
main();
