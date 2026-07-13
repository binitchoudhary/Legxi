import 'dotenv/config';
import { executeGraphQL } from './src/shopify/client.js';

async function checkOrderEvents() {
  const QUERY = `
  query GetOrderEvents {
    orders(first: 1, query: "name:1007") {
      edges {
        node {
          id
          name
          createdAt
          events(first: 10) {
            edges {
              node {
                createdAt
                message
              }
            }
          }
        }
      }
    }
  }`;
  
  const res = await executeGraphQL(QUERY, {}, "GetOrderEvents", "req-test-1007");
  console.log(JSON.stringify(res, null, 2));
}

checkOrderEvents();
