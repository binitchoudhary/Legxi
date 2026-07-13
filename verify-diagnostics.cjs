require('dotenv').config();
const fs = require('fs');

async function run() {
  const data = fs.readFileSync('C:\\Users\\dell\\Downloads\\product_issues_2026-07-06_18-07-43.csv', 'utf8');
  const lines = data.split('\n');
  
  const invalidPriceIds = [];
  const unableToCheckUrls = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    let cols = [];
    let current = '';
    let inQuotes = false;
    for(let char of line) {
      if(char === '"') inQuotes = !inQuotes;
      else if(char === ',' && !inQuotes) { cols.push(current); current = ''; }
      else current += char;
    }
    cols.push(current);
    
    if (cols[7] === 'Invalid price' && !invalidPriceIds.includes(cols[0])) {
      invalidPriceIds.push(cols[0]);
    }
    
    if (cols[7] === 'Unable to check product pages' && unableToCheckUrls.length < 3) {
      const parts = cols[0].split('_');
      if (parts.length >= 4) {
        // Need to query Shopify by ID to get handle, not construct invalid URL
        // We will just do GraphQL
      }
    }
  }

  console.log("=== INVALID PRICE VARIANTS ===");
  const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
  const H = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };
  
  for (let id of invalidPriceIds) {
    const parts = id.split('_');
    const varId = parts[3];
    const query = `query { productVariant(id: "gid://shopify/ProductVariant/${varId}") { title price compareAtPrice product { title handle } } }`;
    const res = await fetch(`https://${process.env.SHOPIFY_STORE}/admin/api/2023-10/graphql.json`, { method: 'POST', headers: H, body: JSON.stringify({ query }) });
    const json = await res.json();
    if (json.data && json.data.productVariant) {
       const v = json.data.productVariant;
       console.log(`- ${v.product.title} / ${v.title} | Price: ${v.price} | CompareAt: ${v.compareAtPrice}`);
       if (unableToCheckUrls.length < 3) {
         unableToCheckUrls.push(`https://${process.env.SHOPIFY_STORE}/products/${v.product.handle}?variant=${varId}`);
       }
    }
  }
  
  console.log("\n=== UNABLE TO CHECK URLS VERIFICATION ===");
  for (let url of unableToCheckUrls) {
    console.log(`URL: ${url}`);
    try {
      const res = await fetch(url, { redirect: 'manual' });
      console.log(`- HTTP Status: ${res.status}`);
      const text = await res.text();
      const canonicalMatch = text.match(/<link rel="canonical" href="([^"]+)"/);
      console.log(`- Canonical: ${canonicalMatch ? canonicalMatch[1] : 'None'}`);
    } catch(e) {
      console.log(`- Error fetching: ${e.message}`);
    }
  }
}

run();
