import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  getAllOwnership, getOwnershipByHandle, createOwnership, updateOwnership,
  createHistoryRecord, getHistoryByCertId,
} from '../services/ownershipRegistry.js';
import { buildHandle } from '../services/transferService.js';
import { sendTransferApprovedNotification, sendTransferRejectedNotification } from '../services/emailService.js';

const router = Router();

router.get('/admin/transfers', requireAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;
    let records = await getAllOwnership();
    if (status && status !== 'all') records = records.filter(r => r.transfer_status === status);
    if (search) {
      const s = search.toLowerCase();
      records = records.filter(r => [r.certificate_id, r.edition_number, r.product_title, r.current_owner_name, r.current_owner_phone, r.original_owner_name, r.original_owner_phone].some(v => (v || '').toLowerCase().includes(s)));
    }
    res.json({ transfers: records, count: records.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/admin/transfers/:handle', requireAdmin, async (req, res) => {
  try {
    const record = await getOwnershipByHandle(req.params.handle);
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json({ transfer: record });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/admin/transfers/:handle', requireAdmin, async (req, res) => {
  try {
    const record = await getOwnershipByHandle(req.params.handle);
    if (!record) return res.status(404).json({ error: 'Not found' });
    const { action, fields } = req.body;
    const now    = new Date().toISOString();
    let   update = { updated_at: now };

    if (action === 'approve') {
      if (!record.pending_to_phone) return res.status(400).json({ error: 'No pending transfer to approve' });
      await createHistoryRecord({
        certificate_id: record.certificate_id || '', edition_number: record.edition_number || '',
        old_owner_name: record.current_owner_name || '', old_owner_phone: record.current_owner_phone || '',
        new_owner_name: record.pending_to_name || '', new_owner_phone: record.pending_to_phone || '',
        transfer_fee: req.body.transfer_fee || '', transfer_date: now, approved_by: req.headers['x-admin-name'] || 'admin',
      }, record.handle || buildHandle(record.certificate_id));
      Object.assign(update, {
        current_owner_name: record.pending_to_name || '', current_owner_phone: record.pending_to_phone || '',
        current_owner_email: record.pending_to_email || '',
        transfer_count: String(parseInt(record.transfer_count || '0', 10) + 1),
        transfer_status: 'active', pending_to_name: '', pending_to_phone: '',
        pending_to_email: '', pending_order_id: '', transfer_reason: '',
      });
    } else if (action === 'reject') {
      Object.assign(update, { transfer_status: 'active', pending_to_name: '', pending_to_phone: '', pending_to_email: '', pending_order_id: '', transfer_reason: '' });
    } else if (action === 'edit' && fields && typeof fields === 'object') {
      Object.assign(update, fields);
    } else {
      return res.status(400).json({ error: 'Invalid action. Use approve | reject | edit' });
    }

    const updated = await updateOwnership(record.id, update);
    res.json({ transfer: updated });

    (async () => {
      if (action === 'approve') {
        const emailRes = await sendTransferApprovedNotification({
          oldOwnerEmail: record.current_owner_email || '',
          newOwnerEmail: record.pending_to_email || '',
          certificateId: record.certificate_id,
          editionNumber: record.edition_number || ''
        });
        console.log(`Transfer Approved\nCertificate ID: ${record.certificate_id}\nOld Owner: ${record.current_owner_name || ''}\nNew Owner: ${record.pending_to_name || ''}\nHistory Created\nApproval Email: ${emailRes.success ? 'Success' : 'Failed'}\nTimestamp: ${new Date().toISOString()}`);
        if (!emailRes.success) console.error(`Email Failed\nReason: ${emailRes.error}\nTimestamp: ${new Date().toISOString()}`);
      } else if (action === 'reject') {
        const emailRes = await sendTransferRejectedNotification({
          email: record.pending_to_email || '',
          certificateId: record.certificate_id,
          reason: req.body.reason || record.transfer_reason || ''
        });
        console.log(`Transfer Rejected\nCertificate ID: ${record.certificate_id}\nCurrent Owner: ${record.current_owner_name || ''}\nRequested Owner: ${record.pending_to_name || ''}\nReason: ${req.body.reason || record.transfer_reason || ''}\nRejection Email: ${emailRes.success ? 'Success' : 'Failed'}\nTimestamp: ${new Date().toISOString()}`);
        if (!emailRes.success) console.error(`Email Failed\nReason: ${emailRes.error}\nTimestamp: ${new Date().toISOString()}`);
      }
    })().catch(err => {
      console.error(`[Background Email Error] Unexpected failure: ${err.message || err}\nTimestamp: ${new Date().toISOString()}`);
    });

  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/admin/transfers', requireAdmin, async (req, res) => {
  try {
    const { certificate_id, edition_number, product_title, edition_type, order_id, owner_name, owner_phone, owner_email } = req.body;
    if (!certificate_id) return res.status(400).json({ error: 'certificate_id is required' });
    if (!owner_phone)    return res.status(400).json({ error: 'owner_phone is required' });
    const handle = buildHandle(certificate_id);
    const now    = new Date().toISOString();
    const existing = await getOwnershipByHandle(handle);
    if (existing) return res.status(409).json({ error: 'Record already exists', existing });
    const record = await createOwnership({
      certificate_id, edition_number: edition_number || '', product_title: product_title || '',
      edition_type: edition_type || '', order_id: order_id || '',
      original_owner_name: owner_name || '', original_owner_phone: owner_phone, original_owner_email: owner_email || '',
      current_owner_name:  owner_name || '', current_owner_phone: owner_phone, current_owner_email: owner_email || '',
      transfer_count: '0', transfer_status: 'active',
      pending_to_name: '', pending_to_phone: '', pending_to_email: '', pending_order_id: '', transfer_reason: '',
      created_at: now, updated_at: now,
    }, handle);
    res.status(201).json({ transfer: record });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/admin/history/:certificateId', requireAdmin, async (req, res) => {
  try {
    const history = await getHistoryByCertId(req.params.certificateId);
    res.json({ history, count: history.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
