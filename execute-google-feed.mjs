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
    for (const e of data.errors) console.log(`  GQL error: ${e.message?.substring(0, 200)}`);
  }
  return data;
}

// Check products published to Google channel
console.log('=== PRODUCTS IN GOOGLE CHANNEL (via productPublicationsV3) ===');
const pubQuery = `
  query {
    channel(id: "gid://shopify/Channel/158805754030") {
      id
      name
      productPublicationsV3(first: 50) {
        edges {
          node {
            isPublished
            publishDate
            product {
              id
              title
              handle
              status
            }
          }
        }
      }
    }
  }
`;
const pubData = await gql(pubQuery);
if (pubData.data?.channel?.productPublicationsV3?.edges) {
  console.log(`Total products in Google channel: ${pubData.data.channel.productPublicationsV3.edges.length}`);
  for (const p of pubData.data.channel.productPublicationsV3.edges) {
    const pp = p.node;
    const prod = pp.product;
    const pid = prod.id.split('/').pop();
    console.log(`  ${pid}: ${prod.title} (published: ${pp.isPublished}, date: ${pp.publishDate})`);
  }
} else {
  console.log(JSON.stringify(pubData.data, null, 2).substring(0, 1000));
}

// Check ProductFeeds (this is what the Google channel creates)
console.log('\n=== PRODUCT FEEDS (countries/languages) ===');
const feedQuery = `
  query {
    productFeeds(first: 10) {
      edges {
        node {
          id
          status
          country
          language
        }
      }
    }
  }
`;
const feedData = await gql(feedQuery);
console.log(JSON.stringify(feedData.data, null, 2));

// Check if we can get the feed URL via REST
console.log('\n=== REST: CHECK GOOGLE SHOPPING SETTINGS ===');
async function rest(path) {
  const res = await fetch(`https://${STORE}/admin/api/2024-10/${path}`, {
    headers: { 'X-Shopify-Access-Token': TOKEN }
  });
  const text = await res.text();
  try { return { status: res.status, json: JSON.parse(text) }; } catch { return { status: res.status, text }; }
}

// Check the Google app settings
const appSettings = await rest('channels/158805754030/information.json');
console.log(`Channel info: ${JSON.stringify(appSettings.json).substring(0, 300)}`);
