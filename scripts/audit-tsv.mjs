import { readFileSync, writeFileSync } from 'fs';

const tsvPath = 'c:\\Users\\DELL\\Downloads\\products_2026-07-24_13-04-12\\products_2026-07-24_13-04-12.tsv';
const content = readFileSync(tsvPath, 'utf8');
const lines = content.split('\n').filter(l => l.trim() !== '');

const headers = lines[0].split('\t').map(h => h.trim());
console.log('Headers:', headers);

let products = [];

for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split('\t');
  let obj = {};
  for (let j = 0; j < headers.length; j++) {
    obj[headers[j]] = parts[j] ? parts[j].trim() : '';
  }
  products.push(obj);
}

console.log('Total Products in TSV:', products.length);
writeFileSync('tsv-data.json', JSON.stringify(products, null, 2));

// Check missing attributes
let issues = {
  missingTitle: 0,
  missingDescription: 0,
  missingImage: 0,
  missingBrand: 0,
  missingAvailability: 0,
  missingCategory: 0,
  missingShipping: 0,
  invalidLinks: 0,
  duplicates: 0
};

let seenIds = new Set();
let shopifyNodesToFetch = new Set();

products.forEach(p => {
  if (!p.title) issues.missingTitle++;
  if (!p.description) issues.missingDescription++;
  if (!p['image link']) issues.missingImage++;
  if (!p.brand) issues.missingBrand++;
  if (!p.availability) issues.missingAvailability++;
  if (!p['google product category']) issues.missingCategory++;
  // Shipping might be in 'shipping' or 'shipping weight'
  if (!p.shipping && !p['shipping weight']) issues.missingShipping++;
  
  const id = p.id;
  if (seenIds.has(id)) {
    issues.duplicates++;
  } else {
    seenIds.add(id);
  }

  // Extract Shopify IDs
  // ID format: shopify_ZZ_9135869231278_47930504249518
  if (id.startsWith('shopify_')) {
    const parts = id.split('_');
    if (parts.length >= 4) {
      const prodId = parts[parts.length - 2];
      const varId = parts[parts.length - 1];
      shopifyNodesToFetch.add(`gid://shopify/Product/${prodId}`);
      shopifyNodesToFetch.add(`gid://shopify/ProductVariant/${varId}`);
    }
  }
});

console.log('Issues found in TSV:', issues);
console.log('Unique Shopify Nodes to verify:', shopifyNodesToFetch.size);
writeFileSync('nodes-to-fetch.json', JSON.stringify(Array.from(shopifyNodesToFetch), null, 2));
