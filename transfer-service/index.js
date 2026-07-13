import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { buildCorsOptions } from './_shared/corsConfig.js';

import lookupRouter   from './routes/lookup.js';
import initiateRouter from './routes/initiate.js';
import requestRouter  from './routes/request.js';
import webhookRouter  from './routes/webhook.js';
import adminRouter    from './routes/admin.js';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));
// Cold-start timestamp — approximates "when this running instance was built/started",
// since there is no separate build step for this plain-ESM service.
const startedAt = new Date().toISOString();

if (!admin.apps.length) admin.initializeApp();

setGlobalOptions({ region: 'us-central1', memory: '512MiB', timeoutSeconds: 60 });

const app = express();

app.use(cors(buildCorsOptions(process.env.ALLOWED_ORIGINS)));

// Raw body only for webhook HMAC — must come before json parser (same ordering as the
// original functions/index.js).
app.use('/transfer/webhook', express.raw({ type: '*/*' }));
app.use(express.json());

app.use(lookupRouter);
app.use(initiateRouter);
app.use(requestRouter);
app.use(webhookRouter);
app.use(adminRouter);

// Additive-only diagnostics — does not change any existing response shape, only adds
// fields alongside the original { ok, ts } that /health has always returned.
app.get('/health', (_, res) => res.json({
  ok: true,
  ts: new Date().toISOString(),
  service: 'transferApi',
  runtime: 'nodejs20',
  uptime: process.uptime(),
  version: pkg.version,
}));

app.get('/version', (_, res) => res.json({
  service: 'transferApi',
  version: pkg.version,
  environment: process.env.NODE_ENV || 'production',
  status: 'ok',
  buildTime: startedAt,
  runtime: 'nodejs20',
  nodeVersion: process.version,
  firebaseFunctionsVersion: pkg.dependencies['firebase-functions'],
}));

// ─── Export as Firebase Gen 2 Function — separate Cloud Run service from Auth's `api` ──
export const transferApi = onRequest(app);
