import db from '../database/db.js';

/**
 * Maps raw SQLite row to domain object
 */
function mapAttempt(row) {
  if (!row) return null;
  return {
    idempotencyKey: row.idempotency_key,
    draftOrderId: row.draft_order_id,
    draftOrderName: row.draft_order_name,
    orderId: row.order_id,
    orderName: row.order_name,
    advanceAmount: row.advance_amount,
    currency: row.currency,
    orderTotal: row.order_total,
    paymentMode: row.payment_mode,
    staffNote: row.staff_note,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    completedAt: row.completed_at
  };
}

export const attemptRepository = {
  getById(idempotencyKey) {
    const row = db.prepare('SELECT * FROM payment_attempts WHERE idempotency_key = ?').get(idempotencyKey);
    return mapAttempt(row);
  },

  /**
   * Creates an attempt and ensures atomicity via transaction.
   */
  create: db.transaction((attempt) => {
    const stmt = db.prepare(`
      INSERT INTO payment_attempts (
        idempotency_key, draft_order_id, advance_amount, currency, payment_mode, staff_note, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      attempt.idempotencyKey,
      attempt.draftOrderId,
      attempt.advanceAmount,
      attempt.currency,
      attempt.paymentMode,
      attempt.staffNote || null,
      attempt.status
    );
    return attemptRepository.getById(attempt.idempotencyKey);
  }),

  /**
   * Updates an attempt using transaction.
   */
  update: db.transaction((idempotencyKey, updates) => {
    const fields = [];
    const values = [];
    
    // Convert camelCase to snake_case for DB
    const fieldMap = {
      status: 'status',
      draftOrderName: 'draft_order_name',
      orderId: 'order_id',
      orderName: 'order_name',
      orderTotal: 'order_total',
      errorMessage: 'error_message'
    };

    for (const [key, value] of Object.entries(updates)) {
      if (fieldMap[key]) {
        fields.push(`${fieldMap[key]} = ?`);
        values.push(value);
      }
    }

    if (updates.status && updates.status !== 'PENDING') {
      fields.push(`completed_at = CURRENT_TIMESTAMP`);
    }

    if (fields.length === 0) return attemptRepository.getById(idempotencyKey);

    values.push(idempotencyKey);
    const sql = `UPDATE payment_attempts SET ${fields.join(', ')} WHERE idempotency_key = ?`;
    
    db.prepare(sql).run(...values);
    return attemptRepository.getById(idempotencyKey);
  }),

  getOrphanedAttempts(minutesOld) {
    // We use datetime to compare with created_at which is CURRENT_TIMESTAMP (UTC)
    const stmt = db.prepare(`
      SELECT * FROM payment_attempts 
      WHERE status IN ('CREATING_ORDER', 'VERIFYING', 'ROLLBACK') 
      AND created_at < datetime('now', '-' || ? || ' minute')
    `);
    const rows = stmt.all(minutesOld);
    return rows.map(mapAttempt);
  }
};
