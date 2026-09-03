import { dashboardRepository } from '../repositories/dashboardRepository.js';
import db, { databaseVersion } from '../database/db.js';
import { ENV } from '../config/env.js';

export const dashboardController = {
  getMetrics(req, res) {
    try {
      const { dateFrom, dateTo } = req.query;
      const metrics = dashboardRepository.getMetrics({ dateFrom, dateTo });
      res.json({ metrics });
    } catch (err) {
      req.id = req.id || 'unknown';
      console.error(`[${req.id}] Error in getMetrics:`, err);
      res.status(500).json({ error: 'Failed to load metrics' });
    }
  },

  getTransactions(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      let limit = parseInt(req.query.limit) || 20;
      if (limit > 100) limit = 100;
      if (limit < 1) limit = 1;
      
      const offset = (page - 1) * limit;

      const validSortBy = ['created_at', 'advance_amount', 'order_total', 'status'];
      let sortBy = req.query.sortBy || 'created_at';
      if (!validSortBy.includes(sortBy)) sortBy = 'created_at';

      let sortDir = (req.query.sortDir || 'DESC').toUpperCase();
      if (sortDir !== 'ASC' && sortDir !== 'DESC') sortDir = 'DESC';

      // shopify_orders_cache.financial_status mirrors Shopify's displayFinancialStatus enum —
      // distinct from the payment_attempts status enum used by getAttempts below.
      const validFinancialStatuses = ['PENDING', 'AUTHORIZED', 'PARTIALLY_PAID', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'VOIDED', 'EXPIRED'];
      let status = req.query.status
        ? req.query.status.split(',').map(s => s.trim()).filter(s => validFinancialStatuses.includes(s))
        : null;
      if (status && status.length === 0) status = null;

      const validModes = ['Cash', 'UPI', 'Bank Transfer', 'Razorpay', 'Other'];
      let paymentMode = req.query.paymentMode;
      if (paymentMode && !validModes.includes(paymentMode)) paymentMode = null;

      const result = dashboardRepository.getTransactions({
        status,
        paymentMode,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        search: req.query.search,
        sortBy,
        sortDir,
        limit,
        offset
      });

      res.json({
        transactions: result.transactions,
        pagination: {
          page,
          limit,
          totalItems: result.totalItems,
          totalPages: Math.ceil(result.totalItems / limit)
        }
      });
    } catch (err) {
      req.id = req.id || 'unknown';
      console.error(`[${req.id}] Error in getTransactions:`, err);
      res.status(500).json({ error: 'Failed to load transactions' });
    }
  },

  getAttempts(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      let limit = parseInt(req.query.limit) || 20;
      if (limit > 100) limit = 100;
      if (limit < 1) limit = 1;

      const offset = (page - 1) * limit;

      const validSortBy = ['created_at', 'advance_amount', 'status'];
      let sortBy = req.query.sortBy || 'created_at';
      if (!validSortBy.includes(sortBy)) sortBy = 'created_at';

      let sortDir = (req.query.sortDir || 'DESC').toUpperCase();
      if (sortDir !== 'ASC' && sortDir !== 'DESC') sortDir = 'DESC';

      // payment_attempts status enum — distinct from the Shopify financial-status enum used by getTransactions.
      const validStatuses = ['PENDING', 'CREATING_ORDER', 'VERIFYING', 'SUCCESS', 'ROLLBACK', 'FAILED'];
      let status = req.query.status
        ? req.query.status.split(',').map(s => s.trim()).filter(s => validStatuses.includes(s))
        : null;
      if (status && status.length === 0) status = null;

      const result = dashboardRepository.getAttempts({
        status,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        sortBy,
        sortDir,
        limit,
        offset
      });

      res.json({
        attempts: result.attempts,
        pagination: {
          page,
          limit,
          totalItems: result.totalItems,
          totalPages: Math.ceil(result.totalItems / limit)
        }
      });
    } catch (err) {
      req.id = req.id || 'unknown';
      console.error(`[${req.id}] Error in getAttempts:`, err);
      res.status(500).json({ error: 'Failed to load attempts' });
    }
  },

  getHealth(req, res) {
    try {
      let dbStatus = 'disconnected';
      try {
        const row = db.prepare('SELECT 1 as val').get();
        if (row.val === 1) dbStatus = 'connected';
      } catch (err) {
        dbStatus = 'error';
      }

      const recentFailures = dashboardRepository.getRecentFailures(10);
      const rollbackWarnings = dashboardRepository.getRollbackWarnings(10);
      const stuckAttempts = dashboardRepository.getStuckAttempts(10);

      res.json({
        health: {
          api: 'ok',
          database: dbStatus,
          uptime: Math.floor(process.uptime()),
          databaseVersion,
          environment: ENV.NODE_ENV
        },
        recentFailures,
        rollbackWarnings,
        stuckAttempts
      });
    } catch (err) {
      req.id = req.id || 'unknown';
      console.error(`[${req.id}] Error in getHealth:`, err);
      res.status(500).json({ error: 'Failed to load health status' });
    }
  }
};
