import 'dotenv/config';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';
const H = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

async function fetchGraphQL(query, variables = {}) {
  const res = await fetch(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json();
  if (json.errors) console.error('GraphQL Error:', JSON.stringify(json.errors, null, 2));
  return json.data;
}

async function getPageId(handle) {
  const query = `
  query getPage($query: String!) {
    pages(first: 1, query: $query) {
      edges {
        node {
          id
          title
        }
      }
    }
  }`;
  const data = await fetchGraphQL(query, { query: `handle:${handle}` });
  if (data?.pages?.edges?.length > 0) {
    return data.pages.edges[0].node.id;
  }
  return null;
}

async function setSeoHidden(ownerId) {
  const mutation = `
  mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }`;
  
  const variables = {
    metafields: [
      {
        ownerId: ownerId,
        namespace: "seo",
        key: "hidden",
        type: "number_integer",
        value: "1"
      }
    ]
  };
  
  const data = await fetchGraphQL(mutation, variables);
  const errors = data?.metafieldsSet?.userErrors;
  if (errors && errors.length > 0) {
    console.error("Mutation Error:", errors);
    return false;
  }
  return true;
}

async function main() {
  const handles = [
    'registration-form',
    'giveaway-quiz',
    'data-sharing-opt-out',
    'kp-account',
    'authentication',
    'career',
    'afa-x-legxi-thank-you'
  ];

  for (const handle of handles) {
    console.log(`Processing page: ${handle}...`);
    const id = await getPageId(handle);
    if (!id) {
      console.log(` -> Not found (skipping)`);
      continue;
    }
    
    const success = await setSeoHidden(id);
    if (success) {
      console.log(` -> SUCCESS! seo.hidden=1 applied to ${id}`);
    } else {
      console.log(` -> FAILED to set metafield for ${id}`);
    }
  }
}
main();
