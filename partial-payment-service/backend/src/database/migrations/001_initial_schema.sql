CREATE TABLE IF NOT EXISTS payment_attempts (
    idempotency_key TEXT PRIMARY KEY,
    draft_order_id TEXT NOT NULL,
    draft_order_name TEXT,
    order_id TEXT,
    order_name TEXT,
    advance_amount TEXT NOT NULL,
    currency TEXT NOT NULL,
    order_total TEXT,
    payment_mode TEXT NOT NULL,
    staff_note TEXT,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

CREATE TABLE IF NOT EXISTS rollback_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_idempotency_key TEXT NOT NULL,
    order_id TEXT NOT NULL,
    order_name TEXT,
    reason TEXT,
    cancel_status TEXT,
    archive_status TEXT,
    manual_action_required BOOLEAN NOT NULL DEFAULT 0,
    cancel_error TEXT,
    archive_error TEXT,
    rolled_back_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_idempotency_key) REFERENCES payment_attempts(idempotency_key)
);
