import { Router } from 'express';
import { phone10 } from '../_shared/phoneUtils.js';
import { requireFirebase } from '../middleware/requireFirebase.js';
import { getCertsByPhone } from '../services/transferService.js';
import { getAllOwnership } from '../services/ownershipRegistry.js';

const router = Router();

router.post('/transfer/lookup', requireFirebase, async (req, res) => {
  try {
    const phone = req.userPhone;
    if (!phone) return res.status(400).json({ error: 'Phone number not found in token' });
    const p10 = phone10(phone);
    const certs = await getCertsByPhone(phone);

    // Cert IDs transferred AWAY from this user (original owner but no longer current owner)
    const allRecords = await getAllOwnership();
    const transferredCertIds = allRecords
      .filter(r => phone10(r.original_owner_phone) === p10
                && phone10(r.current_owner_phone)  !== p10
                && r.transfer_status === 'approved')
      .map(r => r.certificate_id);

    res.json({ certificates: certs, phone, transferredCertIds });
  } catch (e) { console.error('[/transfer/lookup]', e.message); res.status(500).json({ error: e.message }); }
});

export default router;
