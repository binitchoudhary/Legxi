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

// Check ResourcePublication fields
console.log('=== RESOURCE PUBLICATION SCHEMA ===');
const schemaQuery = `
  query {
    __type(name: "ResourcePublication") {
      name
      fields {
        name
        type {
          name
          kind
        }
      }
    }
  }
`;
const schemaData = await gql(schemaQuery);
console.log(JSON.stringify(schemaData.data, null, 2));

// Check Channel.products
console.log('\n=== CHANNEL PRODUCTS ===');
const channelQuery = `
  query {
    channel(id: "gid://shopify/Channel/158805754030") {
      id
      name
      products(first: 50) {
        edges {
          node {
            id
            title
            handle
            status
          }
        }
      }
    }
  }
`;
const chData = await gql(channelQuery);
if (chData.data?.channel?.products?.edges) {
  console.log(`Total products: ${chData.data.channel.products.edges.length}`);
  for (const p of chData.data.channel.products.edges) {
    const prod = p.node;
    const pid = prod.id.split('/').pop();
    console.log(`  ${pid}: ${prod.title} (${prod.status}) - ${prod.handle}`);
  }
} else {
  console.log(JSON.stringify(chData.data, null, 2).substring(0, 1000));
}

// Also check the ProductFeeds
console.log('\n=== PRODUCT FEEDS ===');
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
