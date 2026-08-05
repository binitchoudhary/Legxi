import 'dotenv/config';

const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const STORE = process.env.SHOPIFY_STORE;
const VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';

async function queryGraphQL(query) {
  const res = await fetch(`https://${STORE}/admin/api/${VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query })
  });
  const text = await res.text();
  console.log("Raw Response:", text);
}

const q = `query {
    deliveryProfiles(first: 5) {
      edges {
        node {
          name
          profileLocationGroups {
            locationGroupZones(first: 10) {
              edges {
                node {
                  zone {
                    name
                    countries {
                      code
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }`;
queryGraphQL(q);
