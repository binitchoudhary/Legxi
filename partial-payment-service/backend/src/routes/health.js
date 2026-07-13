import { Router } from 'express';
import { readFileSync } from 'fs';
import db, { databaseVersion } from '../database/db.js';
import { ENV } from '../config/env.js';

const router = Router();
const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url)));

router.get('/health', (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const row = db.prepare('SELECT 1 as val').get();
    if (row.val === 1) dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'error';
  }

  res.json({
    status: 'ok',
    version: pkg.version,
    uptime: Math.floor(process.uptime()),
    database: dbStatus,
    databaseVersion: databaseVersion,
    dryRun: ENV.DRY_RUN,
    environment: ENV.NODE_ENV
  });
});

export default router;
