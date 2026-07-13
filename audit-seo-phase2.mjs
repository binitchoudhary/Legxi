import fs from 'fs';

async function auditUrl(url, type) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    
    // Quick regex parsing for speed without external libs
    const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
    const canonical = canonicalMatch ? canonicalMatch[1] : 'Missing';
    
    const schemas = [];
    const schemaRegex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = schemaRegex.exec(html)) !== null) {
      try {
        const json = JSON.parse(match[1]);
        if (Array.isArray(json)) {
          json.forEach(j => schemas.push(j['@type']));
        } else {
          schemas.push(json['@type']);
        }
      } catch(e) {}
    }

    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Missing';

    console.log(`\n--- AUDITING: ${type} (${url}) ---`);
    console.log(`Title: ${title}`);
    console.log(`Canonical: ${canonical}`);
    console.log(`Schemas Found: ${schemas.length > 0 ? schemas.join(', ') : 'None'}`);
    
    // Basic lazy loading check
    const imgCount = (html.match(/<img/g) || []).length;
    const lazyCount = (html.match(/<img[^>]+loading=["']lazy["']/gi) || []).length;
    console.log(`Images: ${imgCount}, Lazy Loaded: ${lazyCount}`);

  } catch(e) {
    console.log(`Failed to audit ${url}: ${e.message}`);
  }
}

async function main() {
  await auditUrl('https://legxi.co/', 'Home Page');
  await auditUrl('https://legxi.co/products/legxi-champions-trinity-set-1', 'Product Page');
  await auditUrl('https://legxi.co/collections/all', 'Collection Page');
  await auditUrl('https://legxi.co/blogs/news', 'Blog Root Page');
  await auditUrl('https://legxi.co/blogs/news/goc-artwork-making-of-the-edition', 'Article Page');
  await auditUrl('https://legxi.co/pages/authentication', 'Standard Page');
}
main();
