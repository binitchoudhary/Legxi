import 'dotenv/config';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const API = 'https://' + STORE + '/admin/api/' + VERSION + '/graphql.json';
const HEADERS = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

const query = `query {
  nodes(ids: [
    "gid://shopify/Product/9135869231278", 
    "gid://shopify/Product/9182003429550",
    "gid://shopify/ProductVariant/47930504249518",
    "gid://shopify/ProductVariant/48101459722414"
  ]) {
    __typename
    ... on Product { id title status handle }
    ... on ProductVariant { id title product { id title status } }
  }
}`;

fetch(API, { method: 'POST', headers: HEADERS, body: JSON.stringify({ query }) })
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(console.error);
