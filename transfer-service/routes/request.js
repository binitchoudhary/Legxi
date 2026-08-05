import { Router } from 'express';
import { requireFirebase } from '../middleware/requireFirebase.js';
import { phone10 } from '../_shared/phoneUtils.js';
import { buildHandle } from '../services/transferService.js';
import { getOwnershipByHandle, getAllOwnership, createOwnership, updateOwnership } from '../services/ownershipRegistry.js';
import { sendTransferRequestNotification, sendCustomerAcknowledgement } from '../services/emailService.js';

const router = Router();

// No-payment transfer request: the customer submits the Shopify Form (form_id 1061345)
// in place of the old draft-order/checkout flow. This route creates a Pending Transfer
// Request directly in the registry (transfer_status: 'pending'), skipping payment_pending
// and draft-order creation entirely. Everything downstream — admin approval, rejection,
// history recording, registry schema — is unchanged from the existing
// /transfer/initiate + webhook flow, which remains intact and unused as a rollback path.
router.post('/transfer/request', requireFirebase, async (req, res) => {
  try {
    const phone = req.userPhone;
    const {
      certificate_id, certificate_handle, to_name, to_phone, to_email, reason,
      original_owner_name, original_owner_email, product_title, edition_number, edition_type, order_id,
      form_fields,
    } = req.body;

    if (!certificate_id || !to_name || !to_phone || !to_email)
      return res.status(400).json({ error: 'certificate_id, to_name, to_phone, to_email are required' });

    if (form_fields) console.log('[/transfer/request] raw captured form fields:', JSON.stringify(form_fields));

    const normalPhone = phone10(phone);
    let record = certificate_handle ? await getOwnershipByHandle(certificate_handle) : null;
    if (!record) { const all = await getAllOwnership(); record = all.find(r => r.certificate_id === certificate_id) || null; }

    if (record) {
      const cp = phone10(record.current_owner_phone);
      if (cp !== normalPhone)                   return res.status(403).json({ error: 'This certificate does not belong to you' });
      if (record.transfer_status === 'pending')  return res.status(400).json({ error: 'A transfer is already pending approval' });
      if (record.transfer_status === 'payment_pending') return res.status(400).json({ error: 'A payment is already in progress' });
    }

    const now = new Date().toISOString();

    if (record) {
      await updateOwnership(record.id, {
        transfer_status: 'pending', pending_to_name: to_name, pending_to_phone: to_phone,
        pending_to_email: to_email, pending_order_id: '', transfer_reason: reason || '', updated_at: now,
      });
    } else {
      await createOwnership({
        certificate_id, edition_number: edition_number || '', product_title: product_title || '',
        edition_type: edition_type || '', order_id: order_id || '',
        original_owner_name: original_owner_name || '', original_owner_phone: phone, original_owner_email: original_owner_email || '',
        current_owner_name:  original_owner_name || '', current_owner_phone: phone, current_owner_email: original_owner_email || '',
        transfer_count: '0', transfer_status: 'pending',
        pending_to_name: to_name, pending_to_phone: to_phone, pending_to_email: to_email,
        pending_order_id: '', transfer_reason: reason || '', created_at: now, updated_at: now,
      }, buildHandle(certificate_id));
    }

    res.json({ ok: true });

    (async () => {
      const currentOwner = original_owner_name || (record ? record.current_owner_name : '');
      const currentEmail = original_owner_email || (record ? record.current_owner_email : '');
      const edition = edition_number || (record ? record.edition_number : '');

      const opsRes = await sendTransferRequestNotification({
        certificateId: certificate_id,
        editionNumber: edition,
        currentOwnerName: currentOwner,
        newOwnerName: to_name
      });

      let custRes = { success: true };
      if (currentEmail) {
        custRes = await sendCustomerAcknowledgement({
          email: currentEmail,
          certificateId: certificate_id,
          name: currentOwner
        });
      }

      console.log(`Transfer Request Created
Certificate ID: ${certificate_id}
Current Owner: ${currentOwner}
New Owner: ${to_name}
Transfer Status: Pending
Operations Email: ${opsRes.success ? 'Success' : 'Failed'}
Customer Email: ${custRes.success ? 'Success' : 'Failed'}
Timestamp: ${new Date().toISOString()}`);

      if (!opsRes.success) {
        console.error(`Email Failed\nReason: ${opsRes.error}\nTimestamp: ${new Date().toISOString()}`);
      }
      if (currentEmail && !custRes.success) {
        console.error(`Email Failed\nReason: ${custRes.error}\nTimestamp: ${new Date().toISOString()}`);
      }
    })().catch(err => {
      console.error(`[Background Email Error] Unexpected failure: ${err.message || err}\nTimestamp: ${new Date().toISOString()}`);
    });

  } catch (e) { console.error('[/transfer/request]', e.message); res.status(500).json({ error: e.message }); }
});

export default router;
