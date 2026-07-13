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
      if (e.message) console.log(`GQL error: ${e.message.substring(0, 200)}`);
    }
  }
  return data;
}

// Get ProductFeed schema
console.log('=== PRODUCT FEED (CORRECTED) ===');
const pfQuery = `
  query {
    productFeeds(first: 5) {
      edges {
        node {
          id
          status
          syncStatus
        }
      }
    }
  }
`;
const pfData = await gql(pfQuery);
console.log(JSON.stringify(pfData.data, null, 2));

// List products published to the Google channel
// Google channel ID: gid://shopify/Channel/158805754030
console.log('\n=== PRODUCTS PUBLISHED TO GOOGLE CHANNEL ===');
const prodQuery = `
  query {
    products(first: 100, query: "-status:draft") {
      edges {
        node {
          id
          title
          handle
          status
          publishedOnCurrentPublication
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
  console.log(`Total products found: ${prodData.data.products.edges.length}`);
  for (const p of prodData.data.products.edges) {
    const prod = p.node;
    const productId = prod.id.split('/').pop();
    console.log(`\n${productId}: ${prod.title}`);
    console.log(`  Handle: ${prod.handle}`);
    console.log(`  Status: ${prod.status}`);
    console.log(`  URL: ${prod.onlineStoreUrl}`);
    console.log(`  Published: ${prod.publishedOnCurrentPublication}`);
    for (const v of prod.variants.edges) {
      const vnode = v.node;
      const vid = vnode.id.split('/').pop();
      console.log(`  Variant ${vid}: ${vnode.title} - ₹${vnode.price} (SKU: ${vnode.sku || '-'} / Barcode: ${vnode.barcode || '-'} / Inv: ${vnode.inventoryQuantity})`);
    }
  }
} else {
  console.log('No products data returned');
  console.log(JSON.stringify(prodData).substring(0, 500));
}

// Check if Trinity Set product is in results
// The product ID from diagnostics was 9135869231278
console.log('\n\n=== SPECIFIC CHECK: DOES TRINITY SET EXIST? ===');
const trinityQuery = `
  query {
    products(first: 5, query: "id:9135869231278") {
      edges {
        node {
          id
          title
          status
        }
      }
    }
  }
`;
const trinityData = await gql(trinityQuery);
console.log(JSON.stringify(trinityData.data, null, 2));

// Check for the SYSTEM ASSIGNED variants
console.log('\n=== SPECIFIC CHECK: SYSTEM ASSIGNED VARIANTS ===');
// Try to get the variants that were invalid price
const variantIds = ['47970894053550', '47970894086318', '47970894119086', '47970894151854', '47970909094062'];
for (const vid of variantIds) {
  const vapQuery = `
    query {
      productVariant(id: "gid://shopify/ProductVariant/${vid}") {
        id
        title
        price
        sku
        product {
          id
          title
        }
      }
    }
  `;
  const vapData = await gql(vapQuery);
  if (vapData.data?.productVariant) {
    console.log(`  FOUND: ${vid} - ${vapData.data.productVariant.title} - ₹${vapData.data.productVariant.price}`);
  } else {
    console.log(`  NOT FOUND: ${vid}`);
  }
}
