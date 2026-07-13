import { ADMIN_SECRET } from '../config/env.js';

export function requireAdmin(req, res, next) {
  const t = req.headers['x-admin-token'] || req.query.admin_token || '';
  if (t !== ADMIN_SECRET) return res.status(403).json({ error: 'Forbidden' });
  next();
}
