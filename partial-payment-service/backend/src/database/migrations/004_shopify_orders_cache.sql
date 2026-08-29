CREATE TABLE IF NOT EXISTS shopify_orders_cache (
  order_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  shopify_updated_at DATETIME NOT NULL,
  financial_status TEXT,
  total_amount REAL DEFAULT 0,
  advance_amount REAL DEFAULT 0,
  remaining_amount REAL DEFAULT 0,
  channel TEXT
);

CREATE INDEX IF NOT EXISTS idx_shopify_orders_created_at ON shopify_orders_cache(created_at);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_status ON shopify_orders_cache(financial_status);

CREATE TABLE IF NOT EXISTS webhook_processed_events (
  webhook_id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_processed_at ON webhook_processed_events(processed_at);
