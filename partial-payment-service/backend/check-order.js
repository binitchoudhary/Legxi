import 'dotenv/config';
import { executeGraphQL } from './src/shopify/client.js';

async function checkOrder() {
  const QUERY = `
  query GetOrder {
    orders(first: 1, query: "name:1008") {
      edges {
        node {
          id
          name
          customAttributes {
            key
            value
          }
          tags
        }
      }
    }
  }`;
  
  const res = await executeGraphQL(QUERY, {}, "GetOrder", "req-test-1008");
  console.log(JSON.stringify(res, null, 2));
}

checkOrder();
