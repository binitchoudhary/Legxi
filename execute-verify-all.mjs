import 'dotenv/config';
const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

async function gql(query) {
  const res = await fetch(`https://${STORE}/admin/api/2024-10/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  if (data.errors) {
    for (const e of data.errors) {
      console.log(`GQL: ${e.message?.substring(0, 200)}`);
    }
  }
  return data;
}

// Get ProductFeed fields (simple)
console.log('=== PRODUCT FEED ===');
const pfQuery = `
  query {
    productFeeds(first: 5) {
      edges {
        node {
          id
          status
        }
      }
    }
  }
`;
const pfData = await gql(pfQuery);
console.log(JSON.stringify(pfData.data, null, 2));

// Get ALL products (remove the publishedOnCurrentPublication field)
console.log('\n=== ALL PRODUCTS (published without channel filter) ===');
const prodQuery = `
  query {
    products(first: 50, query: "-status:draft") {
      edges {
        node {
          id
          title
          handle
          status
          onlineStoreUrl
          variants(first: 10) {
            edges {
              node {
                id
                title
                price
                sku
                barcode
                inventoryQuantity
              }
            }
          }
        }
      }
    }
  }
`;
const prodData = await gql(prodQuery);
if (prodData.data?.products?.edges) {
  console.log(`Total products: ${prodData.data.products.edges.length}`);
  for (const p of prodData.data.products.edges) {
    const prod = p.node;
    const productId = prod.id.split('/').pop();
    console.log(`\n${productId}: "${prod.title}"`);
    console.log(`  Handle: ${prod.handle}`);
    console.log(`  Status: ${prod.status}`);
    console.log(`  URL: ${prod.onlineStoreUrl}`);
    for (const v of prod.variants.edges) {
      const vnode = v.node;
      const vid = vnode.id.split('/').pop();
      console.log(`  Variant ${vid}: "${vnode.title}" - ₹${vnode.price} (SKU: ${vnode.sku || '-'})`);
    }
  }
} else {
  console.log('No data:', JSON.stringify(prodData).substring(0, 200));
}

// Check Google Merchant Center listing status via REST
console.log('\n\n=== REST: CHECK PRODUCT LISTING STATUS ===');
async function rest(path) {
  const res = await fetch(`https://${STORE}/admin/api/2024-10/${path}`, {
    headers: { 'X-Shopify-Access-Token': TOKEN }
  });
  return res.json();
}

// Check inventory items for Trinity product variants
const trinityVariants = ['47930504249518'];
for (const vid of trinityVariants) {
  const vData = await rest(`variants/${vid}.json`);
  console.log(`Variant ${vid}: ${vData.errors ? 'NOT FOUND' : 'FOUND'}`);
}

// Check currency settings
console.log('\n=== SHOP CURRENCY SETTINGS ===');
const shop = await rest('shop.json');
if (shop.shop) {
  console.log(`Currency: ${shop.shop.currency}`);
  console.log(`Money format: ${shop.shop.money_with_currency_format}`);
  console.log(`Timezone: ${shop.shop.iana_timezone}`);
  console.log(`Enabled currencies: ${shop.shop.enabled_presentment_currencies ? shop.shop.enabled_presentment_currencies.join(', ') : 'not available'}`);
}

// Check inventory for Google Shopping channel
console.log('\n=== INVENTORY ITEMS CHECK ===');
const invItems = await rest('inventory_items.json?limit=10');
console.log(`Inventory items count: ${invItems.inventory_items?.length || 0}`);
