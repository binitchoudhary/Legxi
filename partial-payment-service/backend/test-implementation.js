import dotenv from 'dotenv';
dotenv.config();

import db from './src/database/db.js';
import { reconcileOrders } from './src/jobs/reconciliationCron.js';
import { dashboardRepository } from './src/repositories/dashboardRepository.js';

async function run() {
  console.log('Running database migrations (auto-runs on import db)...');
  
  console.log('Running reconciliation to fetch recent Shopify Orders...');
  await reconcileOrders(24 * 7); // Fetch last 7 days for test

  console.log('--- Cache Table Sample ---');
  const cache = db.prepare('SELECT * FROM shopify_orders_cache LIMIT 5').all();
  console.log(cache);

  console.log('--- Dashboard Metrics Output ---');
  const metrics = dashboardRepository.getMetrics();
  console.log(JSON.stringify(metrics, null, 2));
}

run();
