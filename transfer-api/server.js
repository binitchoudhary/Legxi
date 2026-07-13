import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import admin from 'firebase-admin';

const app = express();

// Support comma-separated list of allowed origins for dev preview + production
const _allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '*')
  .split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || _allowedOrigins.includes('*') || _allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token'],
  credentials: true,
}));

// Raw body for webhook HMAC verification (must come before json parser)
app.use('/transfer/webhook', express.raw({ type: '*/*' }));
app.use(express.json());

// ─── Firebase Admin Init ───────────────────────────────────────────────────────
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  } else {
    admin.initializeApp(); // Cloud Run Application Default Credentials
  }
} catch (e) {
  console.warn('[Firebase] Failed to init Admin SDK:', e.message);
}

// ─── Shopify API Config ────────────────────────────────────────────────────────
const STORE           = process.env.SHOPIFY_STORE;
const TOKEN           = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VER         = process.env.SHOPIFY_API_VERSION || '2025-10';
const ADMIN_SECRET    = process.env.ADMIN_SECRET || 'changeme';
const WEBHOOK_SECRET  = process.env.SHOPIFY_WEBHOOK_SECRET || '';
const TRANSFER_FEE    = process.env.TRANSFER_FEE_AMOUNT || '499.00';
const BASE            = `https://${STORE}/admin/api/${API_VER}`;
const HEADERS         = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

const phone10 = p => (p || '').replace(/\D/g, '').slice(-10);

async function gql(query, variables = {}) {
  const res = await fetch(`${BASE}/graphql.json`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function rest(path, method = 'GET', body = null) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ─── Middleware ────────────────────────────────────────────────────────────────
async function requireFirebase(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Missing auth token' });
  try {
    const decoded   = await admin.auth().verifyIdToken(token);
    req.firebaseUid  = decoded.uid;
    req.userPhone    = decoded.phone_number || '';
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  const t = req.headers['x-admin-token'] || req.query.admin_token || '';
  if (t !== ADMIN_SECRET) return res.status(403).json({ error: 'Forbidden' });
  next();
}

// ─── Metaobject Helpers ────────────────────────────────────────────────────────
function nodeToRecord(node) {
  const f = {};
  (node.fields || []).forEach(({ key, value }) => { f[key] = value ?? ''; });
  return { id: node.id, handle: node.handle, ...f };
}

async function getAllOwnership() {
  const q = `query {
    metaobjects(type:"certificate_ownership", first:250) {
      edges { node { id handle fields { key value } } }
    }
  }`;
  const d = await gql(q);
  return (d?.data?.metaobjects?.edges || []).map(e => nodeToRecord(e.node));
}

async function getOwnershipByHandle(handle) {
  const all = await getAllOwnership();
  return all.find(r => r.handle === handle) || null;
}

async function createMetaobject(type, fields, handle) {
  const m = `mutation C($m:MetaobjectCreateInput!) {
    metaobjectCreate(metaobject:$m) {
      metaobject { id handle fields { key value } }
      userErrors { field message }
    }
  }`;
  const fieldInput = Object.entries(fields).map(([key, value]) => ({ key, value: value == null ? '' : String(value) }));
  const d = await gql(m, { m: { type, handle, fields: fieldInput } });
  const r = d?.data?.metaobjectCreate;
  if (r?.userErrors?.length) throw new Error(r.userErrors[0].message);
  return nodeToRecord(r.metaobject);
}

async function createOwnership(fields, handle) {
  return createMetaobject('certificate_ownership', fields, handle);
}

async function createHistoryRecord(record, certHandle) {
  // Handle: hist-{epochms}-{cert-handle-slug} — guaranteed unique, sortable by time
  const slug   = certHandle.replace(/^cert-/, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const handle = `hist-${Date.now()}-${slug}`.slice(0, 255);
  return createMetaobject('certificate_transfer_history', record, handle);
}

async function getAllHistory() {
  const q = `query {
    metaobjects(type:"certificate_transfer_history", first:250) {
      edges { node { id handle fields { key value } } }
    }
  }`;
  const d = await gql(q);
  return (d?.data?.metaobjects?.edges || []).map(e => nodeToRecord(e.node));
}

async function getHistoryByCertId(certificateId) {
  const all = await getAllHistory();
  return all
    .filter(r => r.certificate_id === certificateId)
    .sort((a, b) => new Date(b.transfer_date || 0) - new Date(a.transfer_date || 0));
}

async function updateOwnership(id, fields) {
  const m = `mutation U($id:ID!,$m:MetaobjectUpdateInput!) {
    metaobjectUpdate(id:$id,metaobject:$m) {
      metaobject { id handle fields { key value } }
      userErrors { field message }
    }
  }`;
  const fieldInput = Object.entries(fields).map(([key, value]) => ({ key, value: value == null ? '' : String(value) }));
  const d = await gql(m, { id, m: { fields: fieldInput } });
  const r = d?.data?.metaobjectUpdate;
  if (r?.userErrors?.length) throw new Error(r.userErrors[0].message);
  return nodeToRecord(r.metaobject);
}

// ─── Certificate Extraction from Shopify Orders ────────────────────────────────
function detectEditionType(item) {
  const all = [
    item.title || '',
    item.variant_title || '',
    item.sku || '',
    item.name || '',
    (item.properties || []).map(p => `${p.name} ${p.value}`).join(' '),
  ].join(' ').toLowerCase();
  if (/artisan/.test(all)) return 'artisan';
  if (/signed/.test(all))  return 'signed';
  return null;
}

function normalizeEditionNum(val) {
  if (!val) return null;
  const s = String(val).trim();
  const slash = s.match(/^(\d+)\s*[/]\s*\d+/);
  if (slash) return '#' + String(parseInt(slash[1], 10)).padStart(3, '0');
  const num = s.match(/#?(\d+)/);
  if (num)   return '#' + String(parseInt(num[1], 10)).padStart(3, '0');
  return null;
}

function extractEditionNum(item, orderNote) {
  // 1. Line item properties
  for (const p of (item.properties || [])) {
    if (/^edition\s*(number)?$/i.test(p.name.trim())) {
      const n = normalizeEditionNum(p.value);
      if (n) return n;
    }
  }
  // 2. Variant title
  const vtNum = normalizeEditionNum(item.variant_title);
  if (vtNum) return vtNum;
  // 3. Order note
  if (orderNote) {
    const lines = orderNote.split(/[\r\n]+/);
    for (const ln of lines) {
      if (ln.includes('|')) {
        const [titlePart, edPart] = ln.split('|');
        if (item.title && item.title.toLowerCase().includes(titlePart.trim().toLowerCase())) {
          const n = normalizeEditionNum(edPart);
          if (n) return n;
        }
      }
    }
    const singleM = orderNote.match(/edition[\s#:]*(\d+)/i) || orderNote.match(/#(\d+)/i);
    if (singleM) return normalizeEditionNum(singleM[1]);
  }
  // 4. SKU
  return normalizeEditionNum(item.sku);
}

function buildCertId(productTitle, editionNum) {
  const slug = (productTitle || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const num  = (editionNum || 'unknown').replace('#', '');
  return `${slug}--${num}`;
}

function buildHandle(certId) {
  return 'cert-' + certId.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function getCertsByPhone(phone) {
  const normalPhone = phone10(phone);
  const allRecords  = await getAllOwnership();
  const recordMap   = new Map(allRecords.map(r => [r.certificate_id, r]));

  // Phase 1: GraphQL — fetch all cert items from orders with metafield edition_type
  const certItemsFromOrders = new Map();

  try {
    const q = `query($q:String!,$of:Int!,$lf:Int!) {
      customers(first:3, query:$q) {
        edges { node {
          id firstName lastName email
          orders(first:$of, sortKey:CREATED_AT, reverse:true) {
            edges { node {
              id name note email cancelledAt
              lineItems(first:$lf) {
                edges { node {
                  title
                  customAttributes { key value }
                  variant {
                    title sku
                    product {
                      title
                      metafield(namespace:"custom", key:"edition_type") { key value }
                    }
                  }
                }}
              }
            }}
          }
        }}
      }
    }`;

    const data = await gql(q, { q: `phone:${phone}`, of: 20, lf: 20 });
    if (data.errors) console.error('[getCertsByPhone] GQL errors:', JSON.stringify(data.errors));

    const seenOrderIds = new Set();
    for (const ce of (data?.data?.customers?.edges || [])) {
      const cust = ce.node;
      const ownerName = `${cust.firstName || ''} ${cust.lastName || ''}`.trim();
      for (const oe of (cust.orders?.edges || [])) {
        const order = oe.node;
        if (order.cancelledAt || seenOrderIds.has(order.id)) continue;
        seenOrderIds.add(order.id);
        for (const le of (order.lineItems?.edges || [])) {
          const item = le.node;
          const prod = item.variant?.product || {};
          const mf   = prod.metafield;
          let edType  = null;
          if (mf?.key === 'edition_type') {
            const mv = (mf.value || '').toLowerCase().trim();
            if (mv === 'artisan' || mv === 'signed') edType = mv;
          }
          if (!edType) continue;

          const bridged = {
            title:         item.title,
            variant_title: item.variant?.title,
            sku:           item.variant?.sku,
            properties:    (item.customAttributes || []).map(a => ({ name: a.key, value: a.value })),
          };
          const edNum = extractEditionNum(bridged, order.note);
          if (!edNum) continue;

          const productTitle = prod.title || item.title;
          const certId = buildCertId(productTitle, edNum);
          if (!certItemsFromOrders.has(certId)) {
            certItemsFromOrders.set(certId, {
              certificate_id:       certId,
              edition_number:       edNum,
              product_title:        productTitle,
              edition_type:         edType,
              order_id:             order.name || String(order.id),
              original_owner_name:  ownerName,
              original_owner_phone: phone,
              original_owner_email: cust.email || order.email || '',
              current_owner_name:   ownerName,
              current_owner_phone:  phone,
              current_owner_email:  cust.email || order.email || '',
              transfer_count:       '0',
              transfer_status:      'active',
            });
          }
        }
      }
    }
  } catch (e) { console.error('[getCertsByPhone]', e.message); }

  // Phase 2: Registry records — enrich edition_type from order data if empty
  const ownedRecords = allRecords
    .filter(r => {
      return phone10(r.current_owner_phone) === normalPhone && r.transfer_status !== 'rejected';
    })
    .map(r => {
      const rec = { ...r, _source: 'registry' };
      if (!rec.edition_type && certItemsFromOrders.has(r.certificate_id)) {
        rec.edition_type = certItemsFromOrders.get(r.certificate_id).edition_type;
      }
      return rec;
    });

  const ownedCertIds = new Set(ownedRecords.map(r => r.certificate_id));

  // Phase 3: Items in orders but not yet in registry
  const orderCerts = [];
  for (const [certId, certData] of certItemsFromOrders) {
    if (ownedCertIds.has(certId)) continue;
    const existing = recordMap.get(certId);
    if (existing) {
      if (phone10(existing.current_owner_phone) !== normalPhone) continue;
      continue;
    }
    orderCerts.push({ ...certData, _source: 'order' });
  }

  // Phase 4: Enrich registry-sourced records with Shopify product image + description
  const allCerts = [...ownedRecords, ...orderCerts];
  const titlesToEnrich = [...new Set(
    allCerts.filter(r => r._source === 'registry' && r.product_title).map(r => r.product_title)
  )];

  if (titlesToEnrich.length > 0) {
    try {
      const titleToCertId = new Map();
      for (const r of allCerts) {
        if (r._source === 'registry' && r.product_title && r.certificate_id) {
          titleToCertId.set(r.product_title, r.certificate_id);
        }
      }

      const productMap = new Map();
      for (const title of titlesToEnrich) {
        const certId = titleToCertId.get(title) || '';
        const handle = certId.replace(/--\d+$/, '');
        if (!handle) continue;

        const keywords = title.replace(/[^a-z0-9 ]/gi, ' ').trim()
          .split(/\s+/).filter(w => w.length > 2).slice(0, 4).join(' ');
        if (!keywords) continue;

        const pd = await gql(`query($q:String!) {
          products(first:1, query:$q) {
            edges { node { description featuredImage { url altText } } }
          }
        }`, { q: keywords });
        const pnode = pd?.data?.products?.edges?.[0]?.node;
        if (pnode) productMap.set(title, {
          product_image_url:   pnode.featuredImage?.url || '',
          product_description: pnode.description || '',
        });
      }
      return allCerts.map(r => r._source === 'registry' && productMap.has(r.product_title)
        ? { ...r, ...productMap.get(r.product_title) }
        : r
      );
    } catch (e) { console.error('[getCertsByPhone] product enrich:', e.message); }
  }

  return allCerts;
}

// ─── Auth Portal Route ────────────────────────────────────────────────────────
app.post('/customer-products', async (req, res) => {
  try {
    const { phoneNumber, ordersFirst = 20, lineItemsFirst = 20 } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber is required' });

    const q = `
      query($q:String!,$of:Int!,$lf:Int!) {
        customers(first:3, query:$q) {
          edges { node {
            id firstName lastName email phone
            orders(first:$of, sortKey:CREATED_AT, reverse:true) {
              edges { node {
                id name note email createdAt processedAt cancelledAt
                lineItems(first:$lf) {
                  edges { node {
                    title quantity
                    customAttributes { key value }
                    variant {
                      id title sku
                      image { url altText }
                      selectedOptions { name value }
                      product {
                        id handle title tags description
                        featuredImage { url altText }
                        metafield(namespace:"custom", key:"edition_type") { key value }
                      }
                    }
                  }}
                }
              }}
            }
          }}
        }
      }
    `;

    const of = Math.min(Number(ordersFirst) || 20, 20);
    const lf = Math.min(Number(lineItemsFirst) || 20, 20);
    const data   = await gql(q, { q: `phone:${phoneNumber}`, of, lf });
    if (data.errors) console.error('[/customer-products] GQL errors:', JSON.stringify(data.errors));
    const result = data.data || { customers: { edges: [] } };

    (result.customers?.edges || []).forEach(ce => {
      (ce.node?.orders?.edges || []).forEach(oe => {
        (oe.node?.lineItems?.edges || []).forEach(le => {
          const n = le.node;
          if (!n) return;
          n.properties = (n.customAttributes || []).map(a => ({ name: a.key, value: a.value }));
          if (n.variant?.product) {
            n.product = n.variant.product;
            if (n.product.featuredImage && !n.product.images) {
              n.product.images = { edges: [{ node: n.product.featuredImage }] };
            }
          }
        });
      });
    });

    res.json(result);
  } catch (e) {
    console.error('[/customer-products]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── Customer Routes ───────────────────────────────────────────────────────────
app.post('/transfer/lookup', requireFirebase, async (req, res) => {
  try {
    const phone = req.userPhone;
    if (!phone) return res.status(400).json({ error: 'Phone number not found in token' });
    const p10 = phone10(phone);
    const certs = await getCertsByPhone(phone);

    const allRecords = await getAllOwnership();
    const transferredCertIds = allRecords
      .filter(r => phone10(r.original_owner_phone) === p10
                && phone10(r.current_owner_phone)  !== p10
                && r.transfer_status === 'approved')
      .map(r => r.certificate_id);

    res.json({ certificates: certs, phone, transferredCertIds });
  } catch (e) {
    console.error('[/transfer/lookup]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Initiate transfer — validates ownership, creates draft order, returns invoice URL
app.post('/transfer/initiate', requireFirebase, async (req, res) => {
  try {
    const phone = req.userPhone;
    const { certificate_id, certificate_handle, to_name, to_phone, to_email, reason } = req.body;

    if (!certificate_id || !to_name || !to_phone || !to_email) {
      return res.status(400).json({ error: 'certificate_id, to_name, to_phone, to_email are required' });
    }

    const normalPhone = phone10(phone);

    let record = certificate_handle ? await getOwnershipByHandle(certificate_handle) : null;
    if (!record) { const all = await getAllOwnership(); record = all.find(r => r.certificate_id === certificate_id) || null; }

    if (record) {
      const cp = phone10(record.current_owner_phone);
      if (cp !== normalPhone) return res.status(403).json({ error: 'This certificate does not belong to you' });
      if (record.transfer_status === 'pending') return res.status(400).json({ error: 'A transfer is already pending approval for this certificate' });
      if (record.transfer_status === 'payment_pending') return res.status(400).json({ error: 'A payment is already in progress for this transfer' });
    }

    // Create Shopify Draft Order with transfer details embedded in note_attributes
    const draftRes = await rest('/draft_orders.json', 'POST', {
      draft_order: {
        line_items: [{
          title: 'Certificate Ownership Transfer Fee',
          price: TRANSFER_FEE,
          quantity: 1,
          requires_shipping: false,
          taxable: false,
        }],
        note: `Ownership transfer: ${certificate_id}`,
        note_attributes: [
          { name: '_transfer_cert_id',    value: certificate_id },
          { name: '_transfer_cert_handle', value: certificate_handle || buildHandle(certificate_id) },
          { name: '_transfer_from_phone', value: phone },
          { name: '_transfer_to_name',    value: to_name },
          { name: '_transfer_to_phone',   value: to_phone },
          { name: '_transfer_to_email',   value: to_email },
          { name: '_transfer_reason',     value: reason || '' },
        ],
        use_customer_default_address: false,
      },
    });

    if (!draftRes.draft_order) {
      throw new Error('Failed to create draft order: ' + JSON.stringify(draftRes.errors || draftRes));
    }

    const { id: draftId, invoice_url } = draftRes.draft_order;
    const now = new Date().toISOString();

    if (record) {
      // Update existing record to payment_pending
      await updateOwnership(record.id, {
        transfer_status: 'payment_pending',
        pending_to_name: to_name,
        pending_to_phone: to_phone,
        pending_to_email: to_email,
        pending_order_id: String(draftId),
        transfer_reason: reason || '',
        updated_at: now,
      });
    } else {
      // Create a new registry record (first transfer from original order)
      const { original_owner_name, original_owner_phone, original_owner_email, product_title, edition_number, edition_type, order_id } = req.body;
      const handle = buildHandle(certificate_id);
      await createOwnership({
        certificate_id,
        edition_number:       edition_number || '',
        product_title:        product_title || '',
        edition_type:         edition_type || '',
        order_id:             order_id || '',
        original_owner_name:  original_owner_name || '',
        original_owner_phone: phone,
        original_owner_email: original_owner_email || '',
        current_owner_name:   original_owner_name || '',
        current_owner_phone:  phone,
        current_owner_email:  original_owner_email || '',
        transfer_count:       '0',
        transfer_status:      'payment_pending',
        pending_to_name:      to_name,
        pending_to_phone:     to_phone,
        pending_to_email:     to_email,
        pending_order_id:     String(draftId),
        transfer_reason:      reason || '',
        created_at:           now,
        updated_at:           now,
      }, handle);
    }

    res.json({ payment_url: invoice_url, draft_order_id: draftId });
  } catch (e) {
    console.error('[/transfer/initiate]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Shopify webhook: orders/paid — fires when draft order invoice is paid
app.post('/transfer/webhook', async (req, res) => {
  try {
    // Verify HMAC
    const hmac = req.headers['x-shopify-hmac-sha256'] || '';
    const hash = crypto.createHmac('sha256', WEBHOOK_SECRET).update(req.body).digest('base64');
    if (WEBHOOK_SECRET && hmac !== hash) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const order = JSON.parse(req.body.toString());
    const attrs = order.note_attributes || [];
    const getA  = (name) => (attrs.find(a => a.name === name) || {}).value || '';

    const certHandle = getA('_transfer_cert_handle');
    if (!certHandle) return res.json({ ok: true }); // Not a transfer order

    const record = await getOwnershipByHandle(certHandle);
    if (!record) return res.json({ ok: true });

    await updateOwnership(record.id, {
      transfer_status: 'pending',
      pending_order_id: String(order.id),
      updated_at: new Date().toISOString(),
    });

    console.log(`[webhook] Transfer pending for ${certHandle} (order ${order.name})`);
    res.json({ ok: true });
  } catch (e) {
    console.error('[webhook]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── Admin Routes ──────────────────────────────────────────────────────────────

// List all transfers with optional filter + search
app.get('/admin/transfers', requireAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;
    let records = await getAllOwnership();

    if (status && status !== 'all') {
      records = records.filter(r => r.transfer_status === status);
    }

    if (search) {
      const s = search.toLowerCase();
      records = records.filter(r =>
        [r.certificate_id, r.edition_number, r.product_title,
         r.current_owner_name, r.current_owner_phone,
         r.original_owner_name, r.original_owner_phone].some(v => (v||'').toLowerCase().includes(s))
      );
    }

    res.json({ transfers: records, count: records.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get single transfer
app.get('/admin/transfers/:handle', requireAdmin, async (req, res) => {
  try {
    const record = await getOwnershipByHandle(req.params.handle);
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json({ transfer: record });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Approve / Reject / Edit transfer
app.put('/admin/transfers/:handle', requireAdmin, async (req, res) => {
  try {
    const record = await getOwnershipByHandle(req.params.handle);
    if (!record) return res.status(404).json({ error: 'Not found' });

    const { action, fields } = req.body;
    const now = new Date().toISOString();

    let update = { updated_at: now };

    if (action === 'approve') {
      if (!record.pending_to_phone) return res.status(400).json({ error: 'No pending transfer to approve' });

      // Write immutable history BEFORE mutating ownership — ensures no data loss
      await createHistoryRecord({
        certificate_id:  record.certificate_id  || '',
        edition_number:  record.edition_number  || '',
        old_owner_name:  record.current_owner_name  || '',
        old_owner_phone: record.current_owner_phone || '',
        new_owner_name:  record.pending_to_name  || '',
        new_owner_phone: record.pending_to_phone || '',
        transfer_fee:    TRANSFER_FEE,
        transfer_date:   now,
        approved_by:     req.headers['x-admin-name'] || 'admin',
      }, record.handle || buildHandle(record.certificate_id));

      Object.assign(update, {
        current_owner_name:  record.pending_to_name  || '',
        current_owner_phone: record.pending_to_phone || '',
        current_owner_email: record.pending_to_email || '',
        transfer_count:      String(parseInt(record.transfer_count || '0', 10) + 1),
        transfer_status:     'approved',
        pending_to_name:     '',
        pending_to_phone:    '',
        pending_to_email:    '',
        pending_order_id:    '',
        transfer_reason:     '',
      });
    } else if (action === 'reject') {
      Object.assign(update, {
        transfer_status:  'active',
        pending_to_name:  '',
        pending_to_phone: '',
        pending_to_email: '',
        pending_order_id: '',
        transfer_reason:  '',
      });
    } else if (action === 'edit' && fields && typeof fields === 'object') {
      // Direct field overrides — admin can change anything
      Object.assign(update, fields);
    } else {
      return res.status(400).json({ error: 'Invalid action. Use approve | reject | edit' });
    }

    const updated = await updateOwnership(record.id, update);
    res.json({ transfer: updated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Manually create an ownership record (for historical orders, offline sales, imports)
app.post('/admin/transfers', requireAdmin, async (req, res) => {
  try {
    const {
      certificate_id, edition_number, product_title, edition_type,
      order_id, owner_name, owner_phone, owner_email,
    } = req.body;

    if (!certificate_id) return res.status(400).json({ error: 'certificate_id is required' });
    if (!owner_phone)    return res.status(400).json({ error: 'owner_phone is required' });

    const handle = buildHandle(certificate_id);
    const now    = new Date().toISOString();

    const existing = await getOwnershipByHandle(handle);
    if (existing) return res.status(409).json({ error: 'A record with this certificate_id already exists', existing });

    const record = await createOwnership({
      certificate_id,
      edition_number:       edition_number || '',
      product_title:        product_title  || '',
      edition_type:         edition_type   || '',
      order_id:             order_id       || '',
      original_owner_name:  owner_name     || '',
      original_owner_phone: owner_phone,
      original_owner_email: owner_email    || '',
      current_owner_name:   owner_name     || '',
      current_owner_phone:  owner_phone,
      current_owner_email:  owner_email    || '',
      transfer_count:       '0',
      transfer_status:      'active',
      pending_to_name:      '',
      pending_to_phone:     '',
      pending_to_email:     '',
      pending_order_id:     '',
      transfer_reason:      '',
      created_at:           now,
      updated_at:           now,
    }, handle);

    res.status(201).json({ transfer: record });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Transfer history for a specific certificate
app.get('/admin/history/:certificateId', requireAdmin, async (req, res) => {
  try {
    const history = await getHistoryByCertId(req.params.certificateId);
    res.json({ history, count: history.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Health check
app.get('/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`\nLEGXI Transfer API — http://localhost:${PORT}\n`));
