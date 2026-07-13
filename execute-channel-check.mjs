import 'dotenv/config';
const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

async function gql(query) {
  const res = await fetch(`https://${STORE}/admin/api/2024-10/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return res.json();
}

// Check Google & YouTube Channel details
console.log('=== GOOGLE & YOUTUBE CHANNEL ===');
const channelQuery = `
  {
    channel(handle: "google") {
      id
      name
      handle
      app {
        id
        name
      }
    }
  }
`;
const channelData = await gql(channelQuery);
console.log(JSON.stringify(channelData.data, null, 2));

// Check Google Channel products
console.log('\n=== PRODUCTS IN GOOGLE CHANNEL ===');
const googleProductsQuery = `
  {
    collectionByHandle(handle: "google") {
      id
      title
      products(first: 50) {
        edges {
          node {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  price
                  sku
                }
              }
            }
          }
        }
      }
    }
  }
`;
const googleProducts = await gql(googleProductsQuery);
console.log(JSON.stringify(googleProducts.data, null, 2).substring(0, 3000));

// Check Market presence (for INR feeds)
console.log('\n=== MARKETS CONFIG ===');
const marketsQuery = `
  {
    markets(first: 10) {
      edges {
        node {
          id
          name
          handle
          enabled
        }
      }
    }
  }
`;
const marketsData = await gql(marketsQuery);
console.log(JSON.stringify(marketsData.data, null, 2));

// Check if there's a way to trigger Google Sync via Publication
console.log('\n=== PUBLICATIONS (CHANNEL SYNC STATUS) ===');
const pubsQuery = `
  {
    publications(first: 10) {
      edges {
        node {
          id
          name
          catalog {
            id
            title
          }
        }
      }
    }
  }
`;
const pubsData = await gql(pubsQuery);
console.log(JSON.stringify(pubsData.data, null, 2));

// Check the Google Sales Channel catalog specifically
console.log('\n=== GOOGLE CATALOG ===');
const catQuery = `
  {
    catalog(id: "gid://shopify/Catalog/158805754030") {
      id
      title
      status
    }
  }
`;
const catData = await gql(catQuery);
console.log(JSON.stringify(catData.data, null, 2));
