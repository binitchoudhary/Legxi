import express from 'express';
import crypto from 'crypto';
import { ENV } from '../config/env.js';
import db from '../database/db.js';
import { getLogger } from '../utils/logger.js';
import { fetchAndUpsertOrder, deleteOrder } from '../services/orderCacheService.js';

const router = express.Router();
const log = getLogger('webhooks');

// Raw body parser is required to compute the exact HMAC signature.
router.use(express.raw({ type: 'application/json' }));

/**
 * Middleware to verify Shopify HMAC signature
 */
function verifyShopifyWebhook(req, res, next) {
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
  if (!hmacHeader) {
    return res.status(401).json({ error: 'Missing HMAC header' });
  }

  try {
    const generatedHash = crypto
      .createHmac('sha256', ENV.SHOPIFY_API_SECRET)
      .update(req.body, 'utf8')
      .digest('base64');

    if (generatedHash !== hmacHeader) {
      log.warn({ hmacHeader, generatedHash }, 'Webhook HMAC validation failed');
      return res.status(401).json({ error: 'Invalid HMAC signature' });
    }

    // After verification, parse the JSON body so the rest of the route can use it
    req.body = JSON.parse(req.body.toString('utf8'));
    next();
  } catch (err) {
    log.error({ err: err.message }, 'Error parsing or validating webhook body');
    res.status(400).json({ error: 'Invalid webhook payload' });
  }
}

/**
 * Deduplication Middleware using SQLite webhook_processed_events table
 */
function deduplicateWebhook(req, res, next) {
  const webhookId = req.get('X-Shopify-Webhook-Id');
  const topic = req.get('X-Shopify-Topic');

  if (!webhookId) return next();

  try {
    // Attempt to insert the webhook ID. If it exists, it will throw a UNIQUE constraint error.
    const stmt = db.prepare('INSERT INTO webhook_processed_events (webhook_id, topic) VALUES (?, ?)');
    stmt.run(webhookId, topic);
    next();
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
      log.info({ webhookId, topic }, 'Ignoring duplicate webhook');
      return res.status(200).send('OK'); // Return 200 so Shopify stops retrying
    }
    log.error({ err: err.message, webhookId }, 'Error in webhook deduplication');
    next(err); // Proceed anyway or return 500, let's proceed to not block valid webhooks on DB error
  }
}

router.post('/', verifyShopifyWebhook, deduplicateWebhook, async (req, res) => {
  const topic = req.get('X-Shopify-Topic');
  const payload = req.body;

  log.info({ topic, id: payload.id || payload.order_id }, 'Received Shopify Webhook');

  // Immediately respond 200 to acknowledge receipt and prevent timeouts
  res.status(200).send('OK');

  // Process asynchronously
  try {
    if (topic === 'orders/delete') {
      const orderId = payload.id;
      if (orderId) deleteOrder(orderId.toString());
    } 
    else if (topic === 'orders/create' || topic === 'orders/updated' || topic === 'orders/paid' || topic === 'orders/cancelled') {
      const orderId = payload.id;
      if (orderId) await fetchAndUpsertOrder(orderId.toString());
    }
    else if (topic === 'order_transactions/create') {
      // payload has order_id
      const orderId = payload.order_id;
      if (orderId) await fetchAndUpsertOrder(orderId.toString());
    }
  } catch (err) {
    log.error({ topic, err: err.message }, 'Failed to process webhook asynchronously');
  }
});

export default router;
