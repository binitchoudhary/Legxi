import { executeGraphQL } from './src/shopify/client.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const query = `
    query getUpdatedOrders($query: String!) {
      orders(first: 5, query: $query, sortKey: UPDATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            displayFinancialStatus
          }
        }
      }
    }
  `;
  const since = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString();
  console.log("Since:", since);
  const q = `updated_at:>=${since} AND (financial_status:partially_paid OR financial_status:paid OR financial_status:refunded)`;
  console.log("Query:", q);
  try {
    const res = await executeGraphQL(query, { query: q }, 'test');
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
