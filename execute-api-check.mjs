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

// Simple query to test
console.log('=== TEST CONNECTION ===');
const testQuery = `{ shop { name myshopifyDomain } }`;
const testData = await gql(testQuery);
console.log(JSON.stringify(testData.data, null, 2));

// Check channel by numeric ID
console.log('\n=== CHANNEL BY HANDLE ===');
const chQuery = `{ channels(first: 5) { edges { node { id name handle } } } }`;
const chData = await gql(chQuery);
console.log(JSON.stringify(chData.data, null, 2));

// Check the feed status for Google Merchant Center
console.log('\n=== GOOGLE MERCHANT CENTER FEED ===');
const gmcQuery = `
  query {
    googleMerchantCenterFeed {
      id
      status
      storefrontUrl
      feedUrl
      submissionInfo {
        submittedCount
        pendingCount
        disapprovedCount
        approvedCount
        lastSubmittedAt
      }
    }
  }
`;
const gmcData = await gql(gmcQuery);
console.log(JSON.stringify(gmcData.data, null, 2));

// Check if inventory items have Google-specific tracking
console.log('\n=== GOOGLE PRODUCT FEED STATUS ===');
const feedQuery = `
  query {
    productFeeds(first: 5) {
      edges {
        node {
          id
          title
          status
          syncStatus {
            status
            lastSyncAt
            errorCount
          }
        }
      }
    }
  }
`;
const feedData = await gql(feedQuery);
console.log(JSON.stringify(feedData.data, null, 2));
