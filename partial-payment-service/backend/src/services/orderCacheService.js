import db from '../database/db.js';
import { executeGraphQL } from '../shopify/client.js';
import { getLogger } from '../utils/logger.js';

const log = getLogger('order-cache-service');

/**
 * Fetches the definitive state of an order from Shopify GraphQL and upserts it into the local cache.
 * Protects against out-of-order updates by checking the `shopify_updated_at` timestamp.
 * 
 * @param {string} orderId - Global ID or Legacy ID (e.g. gid://shopify/Order/1234 or "1234")
 */
export async function fetchAndUpsertOrder(orderId) {
  try {
    // Ensure it's a gid
    const gid = orderId.includes('gid://') ? orderId : `gid://shopify/Order/${orderId}`;

    const query = `
      query getOrderDetails($id: ID!) {
        order(id: $id) {
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
    `;

    const result = await executeGraphQL(query, { id: gid }, 'getOrderDetails');
    
    // If the order is completely deleted/not found via GraphQL, we delete it from cache
    if (!result.data || !result.data.order) {
      log.warn({ orderId: gid }, 'Order not found in Shopify, removing from cache');
      deleteOrder(gid);
      return false;
    }

    const o = result.data.order;
    const shopifyUpdatedAt = new Date(o.updatedAt).getTime();

    // Protection against out-of-order updates
    const existing = db.prepare('SELECT shopify_updated_at FROM shopify_orders_cache WHERE order_id = ?').get(gid);
    if (existing) {
      const existingUpdatedAt = new Date(existing.shopify_updated_at).getTime();
      if (shopifyUpdatedAt <= existingUpdatedAt) {
        log.info({ orderId: gid, shopifyUpdatedAt, existingUpdatedAt }, 'Ignoring older or identical order update');
        return true;
      }
    }

    const totalAmount = parseFloat(o.totalPriceSet?.shopMoney?.amount || 0);
    const advanceAmount = parseFloat(o.totalReceivedSet?.shopMoney?.amount || 0);
    const remainingAmount = parseFloat(o.totalOutstandingSet?.shopMoney?.amount || 0);
    const channelName = o.channel?.name || 'Online Store'; // Default or extracted channel

    const stmt = db.prepare(`
      INSERT INTO shopify_orders_cache (
        order_id, name, created_at, shopify_updated_at, financial_status,
        total_amount, advance_amount, remaining_amount, channel
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(order_id) DO UPDATE SET
        name = excluded.name,
        created_at = excluded.created_at,
        shopify_updated_at = excluded.shopify_updated_at,
        financial_status = excluded.financial_status,
        total_amount = excluded.total_amount,
        advance_amount = excluded.advance_amount,
        remaining_amount = excluded.remaining_amount,
        channel = excluded.channel
    `);

    stmt.run(
      gid,
      o.name,
      o.createdAt,
      o.updatedAt,
      o.displayFinancialStatus,
      totalAmount,
      advanceAmount,
      remainingAmount,
      channelName
    );

    log.info({ orderId: gid, status: o.displayFinancialStatus }, 'Successfully upserted order into cache');
    return true;

  } catch (err) {
    log.error({ orderId, err: err.message }, 'Failed to fetch and upsert order');
    throw err;
  }
}

/**
 * Removes an order from the cache. Used for orders/delete webhooks.
 */
export function deleteOrder(orderId) {
  const gid = orderId.includes('gid://') ? orderId : `gid://shopify/Order/${orderId}`;
  try {
    const stmt = db.prepare('DELETE FROM shopify_orders_cache WHERE order_id = ?');
    stmt.run(gid);
    log.info({ orderId: gid }, 'Successfully deleted order from cache');
  } catch (err) {
    log.error({ orderId, err: err.message }, 'Failed to delete order from cache');
    throw err;
  }
}
