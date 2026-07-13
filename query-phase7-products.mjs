import 'dotenv/config';
const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-10';
const H = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

const itemsToCheck = [
  // Invalid price products
  { id: 'shopify_ZZ_9135869231278_47930504249518', title: 'Trinity Set Slot 03' },
  { id: 'shopify_ZZ_9143560437934_47975039991982', title: 'Argentine Icons 24K Signature Series Emiliano Martinez (9 Pieces) / Edition #010' },
  { id: 'shopify_ZZ_9143560437934_47975040647342', title: 'Argentine Icons 24K Signature Series Julian Alvarez (9 Pieces) / Edition #010' },
  { id: 'shopify_ZZ_9143560437934_47970894020782', title: 'Argentine Icons 24K Signature Series Emiliano Martinez (9 Pieces)' },
  { id: 'shopify_ZZ_9143560437934_47970894053550', title: 'Argentine Icons 24K Signature Series Enzo Fernandes (10 Pieces) / SYSTEM ASSIGNED' },
  { id: 'shopify_ZZ_9143560437934_47970894086318', title: 'Argentine Icons 24K Signature Series Julian Alvarez (9 Pieces) / SYSTEM ASSIGNED' },
  { id: 'shopify_ZZ_9143560437934_47970894119086', title: 'Argentine Icons 24K Signature Series Lautaro Martinez (10 Pieces) / SYSTEM ASSIGNED' },
  { id: 'shopify_ZZ_9143560437934_47970894151854', title: 'Argentine Icons 24K Signature Series Rodrigo De Paul (7 Pieces) / SYSTEM ASSIGNED' },
  { id: 'shopify_ZZ_9143560437934_47970909094062', title: 'Argentine Icons 24K Signature Series Lionel Messi (10 Pieces) / SYSTEM ASSIGNED' },
];

async function gql(query) {
  const res = await fetch(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST', headers: H, body: JSON.stringify({ query })
  });
  return res.json();
}

// First get the variant IDs from the item IDs
// Item ID format: shopify_ZZ_{productId}_{variantId}
for (const item of itemsToCheck) {
  const parts = item.id.replace('shopify_ZZ_', '').split('_');
  const productGID = parts[0];
  const variantGID = parts[1];
  
  console.log(`\n=== ${item.title} ===`);
  console.log(`Product GID: gid://shopify/Product/${productGID}`);
  console.log(`Variant GID: gid://shopify/ProductVariant/${variantGID}`);

  // Fetch variant info
  const variantQuery = `
    query {
      productVariant(id: "gid://shopify/ProductVariant/${variantGID}") {
        id
        title
        price
        compareAtPrice
        sku
        barcode
        inventoryQuantity
        product {
          id
          title
          handle
          status
        }
      }
    }
  `;
  const vData = await gql(variantQuery);
  const v = vData.data?.productVariant;
  if (v) {
    console.log(`  Variant Title: ${v.title}`);
    console.log(`  Price: ${v.price}`);
    console.log(`  CompareAt: ${v.compareAtPrice}`);
    console.log(`  SKU: ${v.sku}`);
    console.log(`  Barcode: ${v.barcode}`);
    console.log(`  Inventory: ${v.inventoryQuantity}`);
    console.log(`  Product Status: ${v.product.status}`);
    console.log(`  Product Handle: ${v.product.handle}`);
  } else {
    console.log(`  ERROR: ${JSON.stringify(vData.errors || vData)}`);
  }
}

// Also fetch the Trinity Set Slot 03 product for image check
console.log('\n\n=== TRINITY SET SLOT 03 FULL CHECK ===');
const prodQuery = `
  query {
    product(id: "gid://shopify/Product/9135869231278") {
      id
      title
      handle
      status
      descriptionHtml
      images(first: 5) {
        edges {
          node {
            id
            url
            altText
            width
            height
          }
        }
      }
      variants(first: 10) {
        edges {
          node {
            id
            title
            price
            compareAtPrice
            sku
            barcode
            image {
              id
              url
              altText
            }
          }
        }
      }
    }
  }
`;
const pData = await gql(prodQuery);
const prod = pData.data?.product;
if (prod) {
  console.log(`Product: ${prod.title} (${prod.status})`);
  console.log(`Handle: ${prod.handle}`);
  console.log(`Images:`);
  for (const img of prod.images.edges) {
    console.log(`  ${img.node.id}: ${img.node.url} (${img.node.width}x${img.node.height})`);
  }
  console.log(`Variants:`);
  for (const v of prod.variants.edges) {
    const img = v.node.image;
    console.log(`  ${v.node.id} - ${v.node.title} - Price: ${v.node.price} - CompareAt: ${v.node.compareAtPrice} - SKU: ${v.node.sku}`);
    if (img) console.log(`    Image: ${img.url}`);
  }
}
