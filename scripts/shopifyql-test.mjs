import 'dotenv/config';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const API = 'https://' + STORE + '/admin/api/' + VERSION + '/graphql.json';
const HEADERS = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

const query = `query {
  shopifyqlQuery(query: "FROM sales SHOW total_sales, orders BY product_title SINCE -1y") {
    parseErrors
    tableData { unformattedData }
  }
}`;

fetch(API, { method: 'POST', headers: HEADERS, body: JSON.stringify({ query }) })
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(console.error);
