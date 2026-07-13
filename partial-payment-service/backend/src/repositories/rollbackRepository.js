import db from '../database/db.js';

function mapRollback(row) {
  if (!row) return null;
  return {
    id: row.id,
    attemptIdempotencyKey: row.attempt_idempotency_key,
    orderId: row.order_id,
    orderName: row.order_name,
    reason: row.reason,
    cancelStatus: row.cancel_status,
    archiveStatus: row.archive_status,
    manualActionRequired: Boolean(row.manual_action_required),
    cancelError: row.cancel_error,
    archiveError: row.archive_error,
    rolledBackAt: row.rolled_back_at
  };
}

export const rollbackRepository = {
  getById(id) {
    const row = db.prepare('SELECT * FROM rollback_events WHERE id = ?').get(id);
    return mapRollback(row);
  },

  /**
   * Logs a rollback event atomically.
   */
  create: db.transaction((event) => {
    const stmt = db.prepare(`
      INSERT INTO rollback_events (
        attempt_idempotency_key, order_id, order_name, reason,
        cancel_status, archive_status, manual_action_required,
        cancel_error, archive_error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      event.attemptIdempotencyKey,
      event.orderId,
      event.orderName || null,
      event.reason || null,
      event.cancelStatus || null,
      event.archiveStatus || null,
      event.manualActionRequired ? 1 : 0,
      event.cancelError || null,
      event.archiveError || null
    );
    
    return rollbackRepository.getById(result.lastInsertRowid);
  })
};
