import 'dotenv/config';
const API = 'https://' + process.env.SHOPIFY_STORE + '/admin/api/' + process.env.SHOPIFY_API_VERSION + '/graphql.json';
const HEADERS = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

const query = `query {
  __type(name: "ShopifyqlQueryData") {
    fields { name type { name kind } }
  }
}`;

fetch(API, { method: 'POST', headers: HEADERS, body: JSON.stringify({ query }) })
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(console.error);
