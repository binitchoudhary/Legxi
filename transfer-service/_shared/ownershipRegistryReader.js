// Read-only access to the certificate_ownership metaobject registry.
// This is the one function-level dependency genuinely shared between the Authentication
// service (/check-ownership) and the Ownership Transfer service — both need to know
// current ownership, but only Transfer ever writes to it (see transfer-service/services/
// ownershipRegistry.js for the write-side operations, which are Transfer-exclusive).
import { gql } from './shopifyClient.js';

export function nodeToRecord(node) {
  const f = {};
  (node.fields || []).forEach(({ key, value }) => { f[key] = value ?? ''; });
  return { id: node.id, handle: node.handle, ...f };
}

export async function getAllOwnership() {
  const q = `query { metaobjects(type:"certificate_ownership", first:250) { edges { node { id handle fields { key value } } } } }`;
  const d = await gql(q);
  return (d?.data?.metaobjects?.edges || []).map(e => nodeToRecord(e.node));
}
