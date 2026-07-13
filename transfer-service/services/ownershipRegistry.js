// Write-side registry operations — Transfer-exclusive (Authentication only ever reads
// via shared/ownershipRegistryReader.js, never writes). Ported verbatim from
// functions/index.js.
import { gql } from '../_shared/shopifyClient.js';
import { nodeToRecord, getAllOwnership } from '../_shared/ownershipRegistryReader.js';

export { getAllOwnership };

export async function getOwnershipByHandle(handle) {
  const all = await getAllOwnership();
  return all.find(r => r.handle === handle) || null;
}

export async function createMetaobject(type, fields, handle) {
  const m = `mutation C($m:MetaobjectCreateInput!) { metaobjectCreate(metaobject:$m) { metaobject { id handle fields { key value } } userErrors { field message } } }`;
  const fieldInput = Object.entries(fields).map(([key, value]) => ({ key, value: value == null ? '' : String(value) }));
  const d = await gql(m, { m: { type, handle, fields: fieldInput } });
  const r = d?.data?.metaobjectCreate;
  if (r?.userErrors?.length) throw new Error(r.userErrors[0].message);
  return nodeToRecord(r.metaobject);
}

export function createOwnership(fields, handle) { return createMetaobject('certificate_ownership', fields, handle); }

export async function createHistoryRecord(record, certHandle) {
  const slug   = certHandle.replace(/^cert-/, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const handle = `hist-${Date.now()}-${slug}`.slice(0, 255);
  return createMetaobject('certificate_transfer_history', record, handle);
}

export async function getAllHistory() {
  const q = `query { metaobjects(type:"certificate_transfer_history", first:250) { edges { node { id handle fields { key value } } } } }`;
  const d = await gql(q);
  return (d?.data?.metaobjects?.edges || []).map(e => nodeToRecord(e.node));
}

export async function getHistoryByCertId(certificateId) {
  const all = await getAllHistory();
  return all.filter(r => r.certificate_id === certificateId)
            .sort((a, b) => new Date(b.transfer_date || 0) - new Date(a.transfer_date || 0));
}

export async function updateOwnership(id, fields) {
  const m = `mutation U($id:ID!,$m:MetaobjectUpdateInput!) { metaobjectUpdate(id:$id,metaobject:$m) { metaobject { id handle fields { key value } } userErrors { field message } } }`;
  const fieldInput = Object.entries(fields).map(([key, value]) => ({ key, value: value == null ? '' : String(value) }));
  const d = await gql(m, { id, m: { fields: fieldInput } });
  const r = d?.data?.metaobjectUpdate;
  if (r?.userErrors?.length) throw new Error(r.userErrors[0].message);
  return nodeToRecord(r.metaobject);
}
