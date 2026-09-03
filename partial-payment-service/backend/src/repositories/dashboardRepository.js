import db from '../database/db.js';

export const dashboardRepository = {
  getMetrics({ dateFrom, dateTo } = {}) {
    let dateFilter = '';
    const params = [];
    if (dateFrom) {
      dateFilter += ' AND created_at >= datetime(?)';
      params.push(dateFrom);
    }
    if (dateTo) {
      dateFilter += ' AND created_at <= datetime(?)';
      params.push(dateTo);
    }

    // Order-Level Metrics (Absolute Source of Truth from Shopify Orders)
    const orderMetricsRow = db.prepare(`
      SELECT 
        COUNT(*) as totalPartialPaymentOrders,
        SUM(advance_amount) as totalAdvanceCollected,
        SUM(remaining_amount) as totalRemainingBalance
      FROM shopify_orders_cache
      WHERE financial_status IN ('PARTIALLY_PAID', 'PAID') AND cancelled_at IS NULL
        ${dateFilter ? dateFilter.replace(/created_at/g, 'datetime(created_at)') : ''}
    `).get(...params);


    // Attempt-Level Metrics (Raw Counts)
    const attemptMetricsRow = db.prepare(`
      SELECT 
        COUNT(*) as totalPaymentAttempts,
        SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as completedAttempts,
        SUM(CASE WHEN status IN ('PENDING','CREATING_ORDER','VERIFYING') THEN 1 ELSE 0 END) as pendingAttempts,
        SUM(CASE WHEN status IN ('FAILED', 'ROLLBACK') THEN 1 ELSE 0 END) as failedAttempts
      FROM payment_attempts
      WHERE 1=1 ${dateFilter}
    `).get(...params);

    const lastSuccess = db.prepare(`SELECT completed_at FROM payment_attempts WHERE status = 'SUCCESS' ORDER BY completed_at DESC LIMIT 1`).get();
    const lastFailed = db.prepare(`SELECT completed_at FROM payment_attempts WHERE status = 'FAILED' ORDER BY completed_at DESC LIMIT 1`).get();

    // All-Shopify-orders metrics (all channels, all financial statuses) — same shopify_orders_cache
    // source of truth as orderMetricsRow above, reusing the same date-boundary handling.
    const allOrdersDateFilter = dateFilter ? dateFilter.replace(/created_at/g, 'datetime(created_at)') : '';

    const totalOrdersRow = db.prepare(`
      SELECT COUNT(*) as totalOrders
      FROM shopify_orders_cache
      WHERE 1=1 ${allOrdersDateFilter}
    `).get(...params);

    const pendingOrdersRow = db.prepare(`
      SELECT
        COUNT(*) as pendingCount,
        SUM(remaining_amount) as pendingRemainingBalance
      FROM shopify_orders_cache
      WHERE financial_status = 'PENDING' AND cancelled_at IS NULL ${allOrdersDateFilter}
    `).get(...params);

    return {
      orderLevel: {
        totalPartialPaymentOrders: orderMetricsRow.totalPartialPaymentOrders || 0,
        totalAdvanceCollected: orderMetricsRow.totalAdvanceCollected || 0,
        totalRemainingBalance: orderMetricsRow.totalRemainingBalance || 0
      },
      allOrders: {
        totalOrders: totalOrdersRow.totalOrders || 0
      },
      pendingPayments: {
        count: pendingOrdersRow.pendingCount || 0,
        remainingBalance: pendingOrdersRow.pendingRemainingBalance || 0
      },
      attemptLevel: {
        totalPaymentAttempts: attemptMetricsRow.totalPaymentAttempts || 0,
        completedAttempts: attemptMetricsRow.completedAttempts || 0,
        pendingAttempts: attemptMetricsRow.pendingAttempts || 0,
        failedAttempts: attemptMetricsRow.failedAttempts || 0
      },
      lastSuccessfulPayment: lastSuccess ? lastSuccess.completed_at : null,
      lastFailedPayment: lastFailed ? lastFailed.completed_at : null
    };
  },

  getTransactions({ status, paymentMode, dateFrom, dateTo, search, sortBy, sortDir, limit, offset }) {
    let sql = `
      SELECT *
      FROM shopify_orders_cache
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      // status may be a single Shopify financial-status value or an array of them
      // (e.g. ['PARTIALLY_PAID', 'PAID'] for the Partial Payments view).
      const statuses = Array.isArray(status) ? status : [status];
      sql += ` AND financial_status IN (${statuses.map(() => '?').join(',')})`;
      params.push(...statuses);
      // Cancelled orders are excluded only for status-filtered views (Pending/Partial
      // Payments) — the unfiltered Orders tab (no status param) still shows them.
      sql += ` AND cancelled_at IS NULL`;
    }
    // paymentMode is not available in shopify_orders_cache easily, so we can ignore it or leave it
    if (paymentMode) {
      // no-op, shopify cache doesn't track specific gateways natively right now
    }
    if (dateFrom) {
      sql += ` AND datetime(created_at) >= datetime(?)`;
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ` AND datetime(created_at) <= datetime(?)`;
      params.push(dateTo);
    }
    if (search) {
      sql += ` AND (name LIKE ?)`;
      params.push(`%${search}%`);
    }

    // Count query
    const countSql = sql.replace(/SELECT \*.*?FROM/s, 'SELECT COUNT(*) as total FROM');
    const total = db.prepare(countSql).get(...params).total;

    // Sorting and Pagination
    // Map sortBy to cache columns
    let sortColumn = 'created_at';
    if (sortBy === 'order_name') sortColumn = 'name';
    else if (sortBy === 'advance_amount') sortColumn = 'advance_amount';
    else if (sortBy === 'status') sortColumn = 'financial_status';

    sql += ` ORDER BY ${sortColumn} ${sortDir} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = db.prepare(sql).all(...params);

    return {
      transactions: rows.map(row => ({
        idempotencyKey: row.order_id, // Use order_id as unique key for React lists
        draftOrderId: null, // deprecated
        draftOrderName: '-', // deprecated
        orderId: row.order_id,
        orderName: row.name,
        advanceAmount: row.advance_amount,
        currency: 'INR',
        orderTotal: row.total_amount,
        remainingBalance: row.remaining_amount?.toFixed(2),
        paymentMode: 'Online', // Shopify canonical doesn't easily expose this in our simple cache
        staffNote: null,
        status: row.financial_status,
        errorMessage: null,
        createdAt: row.created_at,
        completedAt: row.shopify_updated_at
      })),
      totalItems: total
    };
  },

  getAttempts({ status, dateFrom, dateTo, sortBy, sortDir, limit, offset }) {
    let sql = `
      SELECT idempotency_key, draft_order_id, draft_order_name, order_id, order_name,
             advance_amount, currency, order_total, payment_mode, staff_note,
             status, error_message, created_at, completed_at
      FROM payment_attempts
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      sql += ` AND status IN (${statuses.map(() => '?').join(',')})`;
      params.push(...statuses);
    }
    if (dateFrom) {
      sql += ` AND datetime(created_at) >= datetime(?)`;
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ` AND datetime(created_at) <= datetime(?)`;
      params.push(dateTo);
    }

    const countSql = sql.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const total = db.prepare(countSql).get(...params).total;

    let sortColumn = 'created_at';
    if (sortBy === 'advance_amount') sortColumn = 'advance_amount';
    else if (sortBy === 'status') sortColumn = 'status';

    sql += ` ORDER BY ${sortColumn} ${sortDir} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = db.prepare(sql).all(...params);

    return {
      attempts: rows.map(r => ({
        idempotencyKey: r.idempotency_key,
        draftOrderId: r.draft_order_id,
        draftOrderName: r.draft_order_name,
        orderId: r.order_id,
        orderName: r.order_name,
        advanceAmount: r.advance_amount,
        currency: r.currency,
        orderTotal: r.order_total,
        paymentMode: r.payment_mode,
        staffNote: r.staff_note,
        status: r.status,
        errorMessage: r.error_message,
        createdAt: r.created_at,
        completedAt: r.completed_at
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
