import fs from 'fs';

const GSC_404 = 'c:\\Users\\dell\\Desktop\\legxi\\gsc_404_urls.txt';
const GSC_NOINDEX = 'c:\\Users\\dell\\Desktop\\legxi\\gsc_noindex_urls.txt';
const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' };

async function validate404s() {
  console.log('--- 1. 404 VALIDATION ---');
  if (!fs.existsSync(GSC_404)) return;
  const lines = fs.readFileSync(GSC_404, 'utf-8').split('\n').filter(Boolean);
  for (let line of lines) {
    const url = line.split(' ')[1];
    if (!url) continue;
    const res = await fetch(url, { headers, redirect: 'manual' });
    if (res.status === 301 || res.status === 302) {
      console.log(`[${res.status} Redirect] ${url} -> ${res.headers.get('location')}`);
    } else {
      console.log(`[Status ${res.status}] ${url}`);
    }
  }
}

async function validateNoindex() {
  console.log('\n--- 2 & 4. NOINDEX & CANONICAL VALIDATION ---');
  const lines = fs.readFileSync(GSC_NOINDEX, 'utf-8').split('\n').filter(Boolean);
  for (let line of lines) {
    const url = line.split(' ')[1];
    if (!url) continue;
    const res = await fetch(url, { headers });
    const text = await res.text();
    const noindexMatch = text.match(/<meta[^>]+name="robots"[^>]+content="[^"]*noindex[^"]*"[^>]*>/i);
    const canonicalMatch = text.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
    console.log(`URL: ${url}`);
    console.log(`  Noindex Tag Present: ${!!noindexMatch}`);
    console.log(`  Canonical Tag: ${canonicalMatch ? canonicalMatch[1] : 'Missing'}`);
  }
}

async function validateSitemap() {
  console.log('\n--- 3. SITEMAP VALIDATION ---');
  const res = await fetch('https://legxi.co/sitemap_products_1.xml?from=7302480625902&to=8925433135342', { headers });
  const text = await res.text();
  const products = ['legxi-goat-collector-trio-set', 'god-of-cricket-100-centuries-edition', 'shreyas-iyer-hand-signed-white-gold-plated-artwork'];
  for (let p of products) {
    console.log(`  Product /${p} in sitemap: ${text.includes(p)}`);
  }
}

async function validateSchema() {
  console.log('\n--- 5 & 6. SCHEMA & MERCHANT VALIDATION ---');
  const res = await fetch('https://legxi.co/products/legxi-goat-collector-trio-set', { headers });
  const text = await res.text();
  const schemas = text.match(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi) || [];
  for (let s of schemas) {
    try {
      const json = JSON.parse(s.replace(/<[^>]+>/g, ''));
      const type = Array.isArray(json) ? json[0]['@type'] : json['@type'];
      if (type === 'Product' || type === 'ProductGroup') {
        const item = Array.isArray(json) ? json[0] : json;
        console.log(`  Product Schema Found!`);
        console.log(`  Has Brand: ${!!item.brand}`);
        console.log(`  Has Offers: ${!!item.offers}`);
        let hasReturn = false, hasShipping = false;
        if (item.offers && item.offers.hasMerchantReturnPolicy) hasReturn = true;
        if (item.offers && item.offers.shippingDetails) hasShipping = true;
        if (Array.isArray(item.offers) && item.offers.length > 0) {
           if (item.offers[0].hasMerchantReturnPolicy) hasReturn = true;
           if (item.offers[0].shippingDetails) hasShipping = true;
        }
        console.log(`  Has Return Policy: ${hasReturn}`);
        console.log(`  Has Shipping Details: ${hasShipping}`);
      }
    } catch(e) {}
  }
}

async function main() {
  await validate404s();
  await validateNoindex();
  await validateSitemap();
  await validateSchema();
}
main();
