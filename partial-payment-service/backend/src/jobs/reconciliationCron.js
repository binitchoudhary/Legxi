import { executeGraphQL } from '../shopify/client.js';
import { fetchAndUpsertOrder } from '../services/orderCacheService.js';
import { getLogger } from '../utils/logger.js';

const log = getLogger('reconciliation-cron');

/**
 * Recovers from missed webhooks (e.g. backend downtime).
 * Fetches all orders updated in the last `hoursBack` hours with relevant financial statuses.
 */
export async function reconcileOrders(hoursBack = 3) {
  log.info({ hoursBack }, 'Starting Shopify order reconciliation');
  
  const since = new Date(Date.now() - (hoursBack * 60 * 60 * 1000)).toISOString();
  
  // We only care about orders that have transitioned to one of our tracked states
  const queryFilter = `updated_at:>=${since} AND (financial_status:pending OR financial_status:partially_paid OR financial_status:paid OR financial_status:refunded OR financial_status:partially_refunded)`;

  const query = `
    query getUpdatedOrders($query: String!, $cursor: String) {
      orders(first: 50, query: $query, sortKey: UPDATED_AT, reverse: true, after: $cursor) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
          }
        }
      }
    }
  `;

  let hasNextPage = true;
  let cursor = null;
  let processed = 0;

  try {
    while (hasNextPage) {
      const variables = { query: queryFilter, cursor };
      const result = await executeGraphQL(query, variables, 'getUpdatedOrders');
      
      const orders = result.data?.orders?.edges || [];
      for (const edge of orders) {
        const orderId = edge.node.id;
        // Upsert order data individually to ensure canonical fetch and out-of-order protection
        await fetchAndUpsertOrder(orderId);
        processed++;
      }

      hasNextPage = result.data?.orders?.pageInfo?.hasNextPage;
      cursor = result.data?.orders?.pageInfo?.endCursor;

      // Small delay to prevent rate limit spikes during massive reconciliations
      await new Promise(res => setTimeout(res, 500));
    }
    log.info({ processed }, 'Completed Shopify order reconciliation');
  } catch (err) {
    log.error({ err: err.message }, 'Failed during order reconciliation');
  }
}
