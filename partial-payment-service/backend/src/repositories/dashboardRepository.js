import db from '../database/db.js';

export const dashboardRepository = {
  getMetrics() {
    const row = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status IN ('PENDING','CREATING_ORDER','VERIFYING') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'ROLLBACK' THEN 1 ELSE 0 END) as rolledBack,
        SUM(CASE WHEN status = 'SUCCESS' THEN CAST(advance_amount AS REAL) ELSE 0 END) as totalAdvanceCollected,
        SUM(CASE WHEN status = 'SUCCESS' AND DATE(created_at) = DATE('now') THEN 1 ELSE 0 END) as todayPayments,
        SUM(CASE WHEN status = 'SUCCESS' AND DATE(created_at) = DATE('now') THEN CAST(advance_amount AS REAL) ELSE 0 END) as todayAdvanceCollected
      FROM payment_attempts
    `).get();

    const lastSuccess = db.prepare(`SELECT completed_at FROM payment_attempts WHERE status = 'SUCCESS' ORDER BY completed_at DESC LIMIT 1`).get();
    const lastFailed = db.prepare(`SELECT completed_at FROM payment_attempts WHERE status = 'FAILED' ORDER BY completed_at DESC LIMIT 1`).get();

    return {
      ...row,
      lastSuccessfulPayment: lastSuccess ? lastSuccess.completed_at : null,
      lastFailedPayment: lastFailed ? lastFailed.completed_at : null
    };
  },

  getTransactions({ status, paymentMode, dateFrom, dateTo, search, sortBy, sortDir, limit, offset }) {
    let sql = `
      SELECT *, 
        (CAST(order_total AS REAL) - CAST(advance_amount AS REAL)) as remaining_balance
      FROM payment_attempts
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }
    if (paymentMode) {
      sql += ` AND payment_mode = ?`;
      params.push(paymentMode);
    }
    if (dateFrom) {
      sql += ` AND created_at >= ?`;
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ` AND created_at <= ?`;
      params.push(dateTo);
    }
    if (search) {
      sql += ` AND (order_name LIKE ? OR draft_order_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    // Count query
    const countSql = sql.replace(/SELECT \*.*?FROM/s, 'SELECT COUNT(*) as total FROM');
    const total = db.prepare(countSql).get(...params).total;

    // Sorting and Pagination
    sql += ` ORDER BY ${sortBy} ${sortDir} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = db.prepare(sql).all(...params);

    return {
      transactions: rows.map(row => ({
        idempotencyKey: row.idempotency_key,
        draftOrderId: row.draft_order_id,
        draftOrderName: row.draft_order_name,
        orderId: row.order_id,
        orderName: row.order_name,
        advanceAmount: row.advance_amount,
        currency: row.currency,
        orderTotal: row.order_total,
        remainingBalance: row.remaining_balance?.toFixed(2),
        paymentMode: row.payment_mode,
        staffNote: row.staff_note,
        status: row.status,
        errorMessage: row.error_message,
        createdAt: row.created_at,
        completedAt: row.completed_at
      })),
      totalItems: total
    };
  },

  getRecentFailures(limit = 10) {
    const rows = db.prepare(`
      SELECT order_name, draft_order_name, error_message, status, created_at
      FROM payment_attempts 
      WHERE status = 'FAILED' 
      ORDER BY created_at DESC LIMIT ?
    `).all(limit);
    
    return rows.map(r => ({
      orderName: r.order_name,
      draftOrderName: r.draft_order_name,
      errorMessage: r.error_message,
      status: r.status,
      createdAt: r.created_at
    }));
  },

  getRollbackWarnings(limit = 10) {
    const rows = db.prepare(`
      SELECT order_name, reason, manual_action_required, cancel_status, rolled_back_at
      FROM rollback_events
      WHERE manual_action_required = 1
      ORDER BY rolled_back_at DESC LIMIT ?
    `).all(limit);

    return rows.map(r => ({
      orderName: r.order_name,
      reason: r.reason,
      manualActionRequired: Boolean(r.manual_action_required),
      cancelStatus: r.cancel_status,
      rolledBackAt: r.rolled_back_at
    }));
  },

  getStuckAttempts(minutes = 10) {
    const rows = db.prepare(`
      SELECT order_name, draft_order_name, status, created_at 
      FROM payment_attempts 
      WHERE status IN ('PENDING', 'CREATING_ORDER', 'VERIFYING', 'ROLLBACK') 
      AND created_at < datetime('now', '-' || ? || ' minute')
    `).all(minutes);

    return rows.map(r => ({
      orderName: r.order_name,
      draftOrderName: r.draft_order_name,
      status: r.status,
      createdAt: r.created_at
    }));
  }
};
