import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import express from 'express';
import db from '../src/database/db.js';
import webhooksRouter from '../src/routes/webhooks.js';
import { ENV } from '../src/config/env.js';

const app = express();
app.use('/api/v1/webhooks/shopify', webhooksRouter);

const PORT = 3001;
const server = app.listen(PORT, async () => {
  console.log(`Test server running on port ${PORT}`);

  try {
    const payload = JSON.stringify({
      id: 6753354186926, // An actual order ID from earlier tests (PAID)
      total_price: "100.00",
      financial_status: "partially_paid" // Intentionally incorrect payload to prove we don't trust it
    });

    const hmac = crypto
      .createHmac('sha256', ENV.SHOPIFY_API_SECRET)
      .update(payload, 'utf8')
      .digest('base64');

    const webhookId = crypto.randomUUID();

    // 1. Send Webhook
    console.log('Sending webhook...');
    const startTime = Date.now();
    const res1 = await fetch(`http://localhost:${PORT}/api/v1/webhooks/shopify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Hmac-Sha256': hmac,
        'X-Shopify-Topic': 'orders/updated',
        'X-Shopify-Webhook-Id': webhookId
      },
      body: payload
    });
    
    console.log(`Webhook responded with status ${res1.status} in ${Date.now() - startTime}ms`);
    
    // 2. Test Deduplication
    console.log('Sending duplicate webhook...');
    const res2 = await fetch(`http://localhost:${PORT}/api/v1/webhooks/shopify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Hmac-Sha256': hmac,
        'X-Shopify-Topic': 'orders/updated',
        'X-Shopify-Webhook-Id': webhookId // Same ID
      },
      body: payload
    });
    console.log(`Duplicate webhook responded with status ${res2.status}`);

    // Wait a moment for the async fetchAndUpsertOrder to complete
    await new Promise(r => setTimeout(r, 2000));

    // 3. Verify Cache
    const order = db.prepare('SELECT * FROM shopify_orders_cache WHERE order_id = ?').get('gid://shopify/Order/6753354186926');
    console.log('Order in Cache:', order);
    console.log('Did it trust the webhook payload? ->', order.financial_status === 'partially_paid' ? 'YES (FAIL)' : `NO, fetched canonical: ${order.financial_status} (SUCCESS)`);

  } catch (err) {
    console.error(err);
  } finally {
    server.close();
    process.exit(0);
  }
});
