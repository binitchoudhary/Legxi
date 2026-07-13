import { Router } from 'express';
import crypto from 'crypto';
import { WEBHOOK_SECRET } from '../config/env.js';
import { getOwnershipByHandle, updateOwnership } from '../services/ownershipRegistry.js';

const router = Router();

// Firebase Functions Gen2's onRequest() wrapper parses application/json bodies at the
// platform level before Express's own middleware runs — req.body is already a parsed
// object by the time this handler runs, regardless of the express.raw()/express.json()
// setup in index.js. Shopify signs the ORIGINAL raw bytes, so HMAC verification must use
// req.rawBody (the raw Buffer Firebase exposes alongside the parsed req.body), not
// req.body itself — using req.body here was the root cause of every HMAC check crashing.
router.post('/transfer/webhook', async (req, res) => {
  try {
    const hmac = req.headers['x-shopify-hmac-sha256'] || '';
    const hash = crypto.createHmac('sha256', WEBHOOK_SECRET).update(req.rawBody).digest('base64');
    if (WEBHOOK_SECRET && hmac !== hash) return res.status(401).json({ error: 'Invalid webhook signature' });

    const order = req.body;
    const getA  = name => ((order.note_attributes || []).find(a => a.name === name) || {}).value || '';
    const certHandle = getA('_transfer_cert_handle');
    if (!certHandle) return res.json({ ok: true });

    const record = await getOwnershipByHandle(certHandle);
    if (!record) return res.json({ ok: true });

    await updateOwnership(record.id, { transfer_status: 'pending', pending_order_id: String(order.id), updated_at: new Date().toISOString() });
    console.log(`[webhook] Transfer pending for ${certHandle}`);
    res.json({ ok: true });
  } catch (e) { console.error('[webhook]', e.message); res.status(500).json({ error: e.message }); }
});

export default router;
