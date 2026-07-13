import 'dotenv/config';
const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

async function gql(query, vars = {}) {
  const res = await fetch(`https://${STORE}/admin/api/2024-10/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: vars })
  });
  const data = await res.json();
  if (data.errors) {
    for (const e of data.errors) console.log(`  Error: ${e.message?.substring(0, 200)}`);
  }
  return data;
}

// Try to query product feeds first (to check scope)
console.log('=== CHECK PRODUCT FEED ACCESS ===');
const pfQuery = `
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
const pfData = await gql(pfQuery);
if (pfData.data?.productFeeds?.edges) {
  console.log('Product feeds accessible!');
  for (const f of pfData.data.productFeeds.edges) {
    console.log(`  ${f.node.id}: ${f.node.country} ${f.node.language} - ${f.node.status}`);
  }
} else {
  console.log('Product feeds not accessible (scoping issue as expected)');
}

// Try to use the productFeedCreate mutation to force a sync
console.log('\n=== TRYING TO CREATE/UPDATE PRODUCT FEED ===');
// First, check what input is needed
const schemaQuery = `
  query {
    __type(name: "ProductFeedInput") {
      fields {
        name
        type {
          kind
          name
        }
      }
    }
  }
`;
const sData = await gql(schemaQuery);
console.log(`ProductFeedInput: ${JSON.stringify(sData.data, null, 2).substring(0, 500)}`);

// Try using publishablePublish to trigger sync on Argentine Icons product
// This mutation publishes a product to a channel, which SHOULD trigger Google re-sync
console.log('\n=== TRIGGERING GOOGLE SYNC VIA PUBLISHABLE PUBLISH ===');
const triggerMutation = `
  mutation {
    publishablePublish(id: "gid://shopify/Product/9143560437934", input: { channelIds: ["gid://shopify/Channel/158805754030"] }) {
      publishable {
        ... on Product {
          id
          title
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;
const triggerData = await gql(triggerMutation);
if (triggerData.data?.publishablePublish?.userErrors?.length > 0) {
  console.log('User errors:', JSON.stringify(triggerData.data.publishablePublish.userErrors));
} else if (triggerData.data?.publishablePublish?.publishable) {
  console.log('SUCCESS: Published to Google channel - should trigger re-sync');
  console.log(`  Product: ${triggerData.data.publishablePublish.publishable.title}`);
} else {
  console.log('Result:', JSON.stringify(triggerData.data, null, 2).substring(0, 500));
}

// Try the same for a few more products
const productIds = [
  'gid://shopify/Product/8807307673774',  // Arshdeep Ball
  'gid://shopify/Product/9156009263278',  // MagShield Argentina
  'gid://shopify/Product/9141154676910',  // Heritage Minis
];
for (const pid of productIds) {
  const m = `
    mutation {
      publishablePublish(id: "${pid}", input: { channelIds: ["gid://shopify/Channel/158805754030"] }) {
        publishable {
          ... on Product {
            id
            title
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  const d = await gql(m);
  if (d.data?.publishablePublish?.publishable) {
    console.log(`✓ Published ${d.data.publishablePublish.publishable.title} to Google channel`);
  } else {
    console.log(`✗ ${pid}: ${JSON.stringify(d.data?.publishablePublish?.userErrors || d.errors || d.data).substring(0, 200)}`);
  }
}
