import 'dotenv/config';

const r = await fetch(
  `https://${process.env.SHOPIFY_STORE}/admin/oauth/access_scopes.json`,
  { headers: { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN } }
);
const d = await r.json();
const scopes = (d.access_scopes || []).map(s => s.handle);
console.log('Current scopes:', scopes.join(', '));

const needed = ['read_metaobjects', 'write_metaobjects', 'read_draft_orders', 'write_draft_orders', 'read_customers', 'read_orders'];
for (const s of needed) {
  console.log(`  ${scopes.includes(s) ? '✓' : '✗ MISSING'} ${s}`);
}
