import dotenv from 'dotenv';
dotenv.config();

import db from '../src/database/db.js';
import { reconcileOrders } from '../src/jobs/reconciliationCron.js';

async function run() {
  console.log('Starting full historical backfill...');
  
  // 10 years back covers the entire store history
  const hoursBack = 24 * 365 * 10; 
  
  await reconcileOrders(hoursBack);
  
  console.log('--- Cache Table Count ---');
  const count = db.prepare('SELECT COUNT(*) as total FROM shopify_orders_cache').get();
  console.log('Total orders in cache:', count.total);

  process.exit(0);
}

run();
