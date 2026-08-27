-- Index for dashboard status-based filtering and aggregation
CREATE INDEX IF NOT EXISTS idx_pa_status ON payment_attempts(status);

-- Index for date-range queries (dashboard pagination + today's metrics)
CREATE INDEX IF NOT EXISTS idx_pa_created_at ON payment_attempts(created_at);

-- Composite index for the most common dashboard query pattern
CREATE INDEX IF NOT EXISTS idx_pa_status_created ON payment_attempts(status, created_at);
