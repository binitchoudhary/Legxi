import dotenv from 'dotenv';
dotenv.config();

import db from '../database/db.js';
import { executeGraphQL } from '../shopify/client.js';

async function backfill() {
  console.log('Starting historical Shopify orders backfill...');
  
  // We want to fetch all PAID, PARTIALLY_PAID, REFUNDED, and PARTIALLY_REFUNDED orders
  // Let's fetch for the last ~10 years using updated_at to ensure we get historical data
  const tenYearsAgo = new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000).toISOString();
  
  // The executeGraphQL alias should be unique, let's use 'backfillOrders'
  const query = `
    query backfillOrders($query: String!, $cursor: String) {
      orders(first: 50, query: $query, sortKey: UPDATED_AT, reverse: true, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id
            name
            createdAt
            updatedAt
            displayFinancialStatus
            channel { name }
            totalPriceSet { shopMoney { amount } }
            totalReceivedSet { shopMoney { amount } }
            totalOutstandingSet { shopMoney { amount } }
          }
        }
      }
    }
  `;

  // Filter for financial statuses that impact the dashboard
  const statuses = ['paid', 'partially_paid', 'refunded', 'partially_refunded'];
  
  const insertStmt = db.prepare(`
    INSERT INTO shopify_orders_cache (
      order_id, name, created_at, shopify_updated_at, financial_status,
      total_amount, advance_amount, remaining_amount, channel
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(order_id) DO UPDATE SET
      financial_status = excluded.financial_status,
      total_amount = excluded.total_amount,
      advance_amount = excluded.advance_amount,
      remaining_amount = excluded.remaining_amount,
      channel = excluded.channel,
      shopify_updated_at = excluded.shopify_updated_at
  `);

  let totalProcessed = 0;

  for (const status of statuses) {
    console.log(`\nFetching ${status} orders...`);
    let hasNextPage = true;
    let cursor = null;
    const queryFilter = `updated_at:>=${tenYearsAgo} AND financial_status:${status}`;

    while (hasNextPage) {
      try {
        const res = await executeGraphQL(query, { query: queryFilter, cursor }, 'backfillOrders');
        const edges = res.data?.orders?.edges || [];
        
        db.transaction(() => {
          for (const edge of edges) {
            const o = edge.node;
            insertStmt.run(
              o.id,
              o.name,
              o.createdAt,
              o.updatedAt,
              o.displayFinancialStatus,
              parseFloat(o.totalPriceSet?.shopMoney?.amount || 0),
              parseFloat(o.totalReceivedSet?.shopMoney?.amount || 0),
              parseFloat(o.totalOutstandingSet?.shopMoney?.amount || 0),
              o.channel?.name || 'Online Store'
            );
            totalProcessed++;
          }
        })();

        hasNextPage = res.data?.orders?.pageInfo?.hasNextPage;
        cursor = res.data?.orders?.pageInfo?.endCursor;
        console.log(`Processed ${totalProcessed} orders so far...`);
        
      } catch (err) {
        console.error(`Error during backfill for ${status}:`, err.message);
        break; // Stop this status loop on fatal error, move to next
      }
    }
  }

  console.log('\n--- Backfill Complete ---');
  console.log(`Total orders processed/upserted: ${totalProcessed}`);
  
  // Verify counts
  const totalCount = db.prepare('SELECT COUNT(*) as count FROM shopify_orders_cache').get().count;
  console.log(`Total rows in cache: ${totalCount}`);
  
  const byStatus = db.prepare('SELECT financial_status, COUNT(*) as count FROM shopify_orders_cache GROUP BY financial_status').all();
  console.log('Cache distribution by status:');
  console.table(byStatus);
}

backfill().catch(console.error);
