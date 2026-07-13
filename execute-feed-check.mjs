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
  if (data.errors) console.log('ERRORS:', JSON.stringify(data.errors, null, 2));
  return data;
}

// Check available fields on ProductFeed
console.log('=== PRODUCT FEEDS ===');
const pfQuery = `
  query {
    productFeeds(first: 5) {
      edges {
        node {
          id
          status
          name
          createdAt
          updatedAt
        }
      }
    }
  }
`;
const pfData = await gql(pfQuery);
console.log(JSON.stringify(pfData.data, null, 2));

// Check Google & YouTube Channel publications status
console.log('\n=== GOOGLE CHANNEL PUBLICATIONS ===');
const pubsQuery = `
  {
    channel(id: "gid://shopify/Channel/158805754030") {
      id
      name
      handle
      publication {
        id
        catalog {
          id
          title
          status
        }
      }
    }
  }
`;
const pubsData = await gql(pubsQuery);
console.log(JSON.stringify(pubsData.data, null, 2));

// Try to find the google sales channel via REST preview
// First check if there's a collect endpoint for Google Sales Channel
console.log('\n=== REST: GOOGLE SALES CHANNEL PRODUCTS ===');
// The Google sales channel uses a publication-based model
// Let's check publications via REST
async function rest(path) {
  const res = await fetch(`https://${STORE}/admin/api/2024-10/${path}`, {
    headers: { 'X-Shopify-Access-Token': TOKEN }
  });
  return res.json();
}

const googleProducts = await rest('products.json?collection_id=google');
console.log(`Google collection products: ${JSON.stringify(googleProducts).substring(0, 300)}`);

// Check the channel by ID via REST
console.log('\n=== REST: CHECK CHANNEL DETAIL ===');
const chData = await rest(`channels/158805754030.json`);
console.log(JSON.stringify(chData, null, 2).substring(0, 500));

// Check if there's a collections for Google channel
console.log('\n=== REST: CHECK ALL COLLECTIONS ===');
const allColl = await rest('collections.json?limit=50');
if (allColl.collections) {
  for (const c of allColl.collections) {
    console.log(`  ${c.id}: ${c.title}`);
  }
}
