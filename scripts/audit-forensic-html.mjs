import fs from 'fs';
import * as cheerio from 'cheerio';

const urlsToTest = [
  'https://legxi.co/',
  'https://legxi.co/collections/all',
  'https://legxi.co/products/arshdeep-x-legxi-as02-edition-cap'
];

async function run() {
  const results = [];
  for (const url of urlsToTest) {
    try {
      const res = await fetch(url);
      const html = await res.text();
      const $ = cheerio.load(html);
      
      const canonicals = $('link[rel="canonical"]');
      const robots = $('meta[name="robots"]');
      
      const schemas = [];
      $('script[type="application/ld+json"]').each((i, el) => {
        try {
          schemas.push(JSON.parse($(el).html()));
        } catch (e) {
          schemas.push({ error: 'Invalid JSON-LD', content: $(el).html() });
        }
      });
      
      results.push({
        url,
        canonicalCount: canonicals.length,
        canonicalHrefs: canonicals.map((i, el) => $(el).attr('href')).get(),
        robotsCount: robots.length,
        robotsContent: robots.map((i, el) => $(el).attr('content')).get(),
        schemaCount: schemas.length,
        schemas
      });
    } catch (err) {
      results.push({ url, error: err.message });
    }
  }
  fs.writeFileSync('forensic_html_audit.json', JSON.stringify(results, null, 2));
  console.log('HTML Audit Complete. Results saved to forensic_html_audit.json');
}

run();
