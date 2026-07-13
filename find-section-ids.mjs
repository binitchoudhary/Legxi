import 'dotenv/config';

const res = await fetch('https://legxi.co/collections/legxi-football-collection');
const html = await res.text();

// Find all shopify-section IDs
const matches = html.match(/id="shopify-section-[^"]+"/g) || [];
matches.forEach(m => console.log(m));

// Also specifically look for featured-collections sections
console.log('\n--- ARGENTINA FAN COLLECTION search ---');
const idx = html.indexOf('ARGENTINA FAN COLLECTION');
if (idx !== -1) {
  console.log('Found at index:', idx);
  console.log('Context:', html.substring(idx - 500, idx + 200));
} else {
  console.log('NOT FOUND on page');
}
