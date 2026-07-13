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
    for (const e of data.errors) console.log(`  Error: ${e.message?.substring(0, 200)}`);
  }
  return data;
}

// Check the publishablePublish mutation signature
console.log('=== PUBLISHABLE PUBLISH SCHEMA ===');
const schemaQuery = `
  query {
    __type(name: "Mutation") {
      fields {
        name
        args {
          name
          type {
            kind
            name
            inputFields {
              name
              type {
                name
              }
            }
          }
        }
      }
    }
  }
`;
const sData = await gql(schemaQuery);
const mutations = sData.data?.__type?.fields || [];
const publishMutations = mutations.filter(m => 
  m.name.includes('publish') || m.name.includes('Publish')
);
for (const m of publishMutations) {
  console.log(`\n${m.name}:`);
  for (const arg of m.args) {
    console.log(`  ${arg.name}: ${arg.type.name} (${arg.type.kind})`);
  }
}

// Try the correct publishablePublish syntax
console.log('\n=== ATTEMPT: PUBLISHABLE PUBLISH ===');
const pubMutation = `
  mutation {
    publishablePublish(id: "gid://shopify/Product/9143560437934", input: { publicationId: "gid://shopify/Publication/158805754030" }) {
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
const pubData = await gql(pubMutation);
console.log(JSON.stringify(pubData.data, null, 2));

// Try publishToChannel instead
console.log('\n=== ATTEMPT: PUBLISH TO CHANNEL ===');
const chMutation = `
  mutation {
    publishablePublishToCurrentChannel(id: "gid://shopify/Product/9143560437934") {
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
const chData = await gql(chMutation);
console.log(JSON.stringify(chData.data, null, 2));
