import { Router } from 'express';
import { rest } from '../_shared/shopifyClient.js';
import { phone10 } from '../_shared/phoneUtils.js';
import { requireFirebase } from '../middleware/requireFirebase.js';
import { TRANSFER_FEE } from '../config/env.js';
import { buildHandle } from '../services/transferService.js';
import { getOwnershipByHandle, getAllOwnership, createOwnership, updateOwnership } from '../services/ownershipRegistry.js';

const router = Router();

router.post('/transfer/initiate', requireFirebase, async (req, res) => {
  try {
    const phone = req.userPhone;
    const { certificate_id, certificate_handle, to_name, to_phone, to_email, reason } = req.body;
    if (!certificate_id || !to_name || !to_phone || !to_email)
      return res.status(400).json({ error: 'certificate_id, to_name, to_phone, to_email are required' });

    const normalPhone = phone10(phone);
    let record = certificate_handle ? await getOwnershipByHandle(certificate_handle) : null;
    if (!record) { const all = await getAllOwnership(); record = all.find(r => r.certificate_id === certificate_id) || null; }

    if (record) {
      const cp = phone10(record.current_owner_phone);
      if (cp !== normalPhone)                    return res.status(403).json({ error: 'This certificate does not belong to you' });
      if (record.transfer_status === 'pending')  return res.status(400).json({ error: 'A transfer is already pending approval' });
      if (record.transfer_status === 'payment_pending') return res.status(400).json({ error: 'A payment is already in progress' });
    }

    const draftRes = await rest('/draft_orders.json', 'POST', {
      draft_order: {
        line_items: [{ title: 'Certificate Ownership Transfer Fee', price: TRANSFER_FEE, quantity: 1, requires_shipping: false, taxable: false }],
        note: `Ownership transfer: ${certificate_id}`,
        note_attributes: [
          { name: '_transfer_cert_id',     value: certificate_id },
          { name: '_transfer_cert_handle', value: certificate_handle || buildHandle(certificate_id) },
          { name: '_transfer_from_phone',  value: phone },
          { name: '_transfer_to_name',     value: to_name },
          { name: '_transfer_to_phone',    value: to_phone },
          { name: '_transfer_to_email',    value: to_email },
          { name: '_transfer_reason',      value: reason || '' },
        ],
        use_customer_default_address: false,
      },
    });
    if (!draftRes.draft_order) throw new Error('Failed to create draft order: ' + JSON.stringify(draftRes.errors || draftRes));

    const { id: draftId, invoice_url } = draftRes.draft_order;
    const now = new Date().toISOString();

    if (record) {
      await updateOwnership(record.id, { transfer_status: 'payment_pending', pending_to_name: to_name, pending_to_phone: to_phone, pending_to_email: to_email, pending_order_id: String(draftId), transfer_reason: reason || '', updated_at: now });
    } else {
      const { original_owner_name, original_owner_email, product_title, edition_number, edition_type, order_id } = req.body;
      await createOwnership({
        certificate_id, edition_number: edition_number || '', product_title: product_title || '',
        edition_type: edition_type || '', order_id: order_id || '',
        original_owner_name: original_owner_name || '', original_owner_phone: phone, original_owner_email: original_owner_email || '',
        current_owner_name:  original_owner_name || '', current_owner_phone: phone, current_owner_email: original_owner_email || '',
        transfer_count: '0', transfer_status: 'payment_pending',
        pending_to_name: to_name, pending_to_phone: to_phone, pending_to_email: to_email,
        pending_order_id: String(draftId), transfer_reason: reason || '', created_at: now, updated_at: now,
      }, buildHandle(certificate_id));
    }

    res.json({ payment_url: invoice_url, draft_order_id: draftId });
  } catch (e) { console.error('[/transfer/initiate]', e.message); res.status(500).json({ error: e.message }); }
});

export default router;
