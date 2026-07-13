CREATE UNIQUE INDEX idx_draft_active ON payment_attempts(draft_order_id) 
WHERE status IN ('PENDING', 'CREATING_ORDER', 'VERIFYING', 'ROLLBACK');
