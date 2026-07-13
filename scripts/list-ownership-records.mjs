import 'dotenv/config';

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}`;
const H    = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

const r = await fetch(`${BASE}/graphql.json`, {
  method: 'POST', headers: H,
  body: JSON.stringify({ query: `{
    metaobjects(type:"certificate_ownership", first:50) {
      edges { node { id handle fields { key value } } }
    }
  }` }),
});
const d = await r.json();
if (d.errors) { console.log('Errors:', JSON.stringify(d.errors)); process.exit(1); }

const records = d?.data?.metaobjects?.edges || [];
console.log('Records found:', records.length);
records.forEach(e => {
  const f = {};
  e.node.fields.forEach(x => f[x.key] = x.value);
  console.log(`\nHandle: ${e.node.handle}`);
  console.log(`  cert_id:           ${f.certificate_id}`);
  console.log(`  status:            ${f.transfer_status}`);
  console.log(`  original_owner:    ${f.original_owner_name} / ${f.original_owner_phone}`);
  console.log(`  current_owner:     ${f.current_owner_name} / ${f.current_owner_phone}`);
  console.log(`  pending_to:        ${f.pending_to_name} / ${f.pending_to_phone}`);
});
