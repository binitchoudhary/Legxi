// Ported verbatim from functions/index.js getCertsByPhone() (post edition-#136 fix).
// No logic changes — only the import paths changed to reference shared/ and the sibling
// services/ modules instead of local same-file functions.
import { gql } from '../_shared/shopifyClient.js';
import { phone10 } from '../_shared/phoneUtils.js';
import { getAllOwnership } from '../_shared/ownershipRegistryReader.js';
import { parseOrderNoteGroups } from './orderParser.js';
import { resolveOrderEditions } from './editionResolver.js';

export function buildCertId(productTitle, editionNum) {
  const slug = (productTitle || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${slug}--${(editionNum || 'unknown').replace('#', '')}`;
}

export function buildHandle(certId) { return 'cert-' + certId.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

export async function getCertsByPhone(phone) {
  const normalPhone = phone10(phone);
  const allRecords  = await getAllOwnership();
  const recordMap   = new Map(allRecords.map(r => [r.certificate_id, r]));

  // Phase 1: GraphQL — fetch all cert items from orders with metafield edition_type
  // (same approach as /customer-products so edition type is always accurate)
  const certItemsFromOrders = new Map(); // certId → cert data

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

        // Built fresh for THIS order only, consumed while looping its line items below,
        // then discarded — never persisted, never shared across orders or customers.
        const noteData = parseOrderNoteGroups(order.note);

        // Pass 1: figure out which line items are certificate-eligible (edType detected).
        const eligible = [];
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

          eligible.push({
            item, prod, edType,
            bridged: {
              title:         item.title,
              variant_title: item.variant?.title,
              sku:           item.variant?.sku,
              properties:    (item.customAttributes || []).map(a => ({ name: a.key, value: a.value })),
            },
          });
        }

        // Pass 2: resolve edition numbers for ALL eligible items of this order AT ONCE
        // (see resolveOrderEditions doc comment for why this can't be done one item at a
        // time) — this is the fix for editions silently disappearing when several line
        // items in one order share an identical product title.
        const edNums = resolveOrderEditions(eligible.map(e => e.bridged), noteData);

        eligible.forEach(({ item, prod, edType }, i) => {
          const edNum = edNums[i];
          if (!edNum) return;

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
        });
      }
    }
  } catch (e) { console.error('[getCertsByPhone]', e.message); }

  // Phase 2: Registry records — enrich edition_type from order data if empty
  const ownedRecords = allRecords
    .filter(r => {
      return phone10(r.current_owner_phone) === normalPhone;
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
      continue; // in registry but not this user's — skip
    }
    orderCerts.push({ ...certData, _source: 'order' });
  }

  // Phase 4: Enrich registry-sourced records with Shopify product image + description
  // (order-sourced records already have this from the GraphQL query)
  const allCerts = [...ownedRecords, ...orderCerts];
  const titlesToEnrich = [...new Set(
    allCerts.filter(r => r._source === 'registry' && r.product_title).map(r => r.product_title)
  )];

  if (titlesToEnrich.length > 0) {
    try {
      // Build title→certId map so we can derive the Shopify product handle
      const titleToCertId = new Map();
      for (const r of allCerts) {
        if (r._source === 'registry' && r.product_title && r.certificate_id) {
          titleToCertId.set(r.product_title, r.certificate_id);
        }
      }

      const productMap = new Map();
      for (const title of titlesToEnrich) {
        // Derive product handle from certificate_id by stripping --{number} suffix
        const certId = titleToCertId.get(title) || '';
        const handle = certId.replace(/--\d+$/, '');
        if (!handle) continue;

        // Keyword search: strip special chars, take first 4 words with len > 2
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
          product_image_url: pnode.featuredImage?.url || '',
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
