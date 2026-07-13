import 'dotenv/config';

const BASE = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}`;
const H    = { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' };

async function gql(query, variables = {}) {
  const r = await fetch(`${BASE}/graphql.json`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ query, variables }),
  });
  return r.json();
}

// ── 1. certificate_ownership ──────────────────────────────────────────────────
const ownershipDef = await gql(`
  mutation {
    metaobjectDefinitionCreate(definition: {
      type: "certificate_ownership"
      name: "Certificate Ownership"
      displayNameKey: "certificate_id"
      fieldDefinitions: [
        { key: "certificate_id",       name: "Certificate ID",        type: "single_line_text_field" }
        { key: "edition_number",       name: "Edition Number",        type: "single_line_text_field" }
        { key: "product_title",        name: "Product Title",         type: "single_line_text_field" }
        { key: "edition_type",         name: "Edition Type",          type: "single_line_text_field" }
        { key: "order_id",             name: "Order ID",              type: "single_line_text_field" }
        { key: "original_owner_name",  name: "Original Owner Name",   type: "single_line_text_field" }
        { key: "original_owner_phone", name: "Original Owner Phone",  type: "single_line_text_field" }
        { key: "original_owner_email", name: "Original Owner Email",  type: "single_line_text_field" }
        { key: "current_owner_name",   name: "Current Owner Name",    type: "single_line_text_field" }
        { key: "current_owner_phone",  name: "Current Owner Phone",   type: "single_line_text_field" }
        { key: "current_owner_email",  name: "Current Owner Email",   type: "single_line_text_field" }
        { key: "transfer_count",       name: "Transfer Count",        type: "single_line_text_field" }
        { key: "transfer_status",      name: "Transfer Status",       type: "single_line_text_field" }
        { key: "pending_to_name",      name: "Pending To Name",       type: "single_line_text_field" }
        { key: "pending_to_phone",     name: "Pending To Phone",      type: "single_line_text_field" }
        { key: "pending_to_email",     name: "Pending To Email",      type: "single_line_text_field" }
        { key: "pending_order_id",     name: "Pending Order ID",      type: "single_line_text_field" }
        { key: "transfer_reason",      name: "Transfer Reason",       type: "single_line_text_field" }
        { key: "created_at",           name: "Created At",            type: "single_line_text_field" }
        { key: "updated_at",           name: "Updated At",            type: "single_line_text_field" }
      ]
    }) {
      metaobjectDefinition { type name }
      userErrors { field message }
    }
  }
`);

const owErr = ownershipDef?.data?.metaobjectDefinitionCreate?.userErrors || [];
if (owErr.length) {
  console.log('certificate_ownership errors:', owErr.map(e => e.message).join(', '));
} else {
  console.log('✓ certificate_ownership definition created');
}

// ── 2. certificate_transfer_history ──────────────────────────────────────────
const historyDef = await gql(`
  mutation {
    metaobjectDefinitionCreate(definition: {
      type: "certificate_transfer_history"
      name: "Certificate Transfer History"
      displayNameKey: "certificate_id"
      fieldDefinitions: [
        { key: "certificate_id",   name: "Certificate ID",   type: "single_line_text_field" }
        { key: "edition_number",   name: "Edition Number",   type: "single_line_text_field" }
        { key: "old_owner_name",   name: "Old Owner Name",   type: "single_line_text_field" }
        { key: "old_owner_phone",  name: "Old Owner Phone",  type: "single_line_text_field" }
        { key: "new_owner_name",   name: "New Owner Name",   type: "single_line_text_field" }
        { key: "new_owner_phone",  name: "New Owner Phone",  type: "single_line_text_field" }
        { key: "transfer_fee",     name: "Transfer Fee",     type: "single_line_text_field" }
        { key: "transfer_date",    name: "Transfer Date",    type: "single_line_text_field" }
        { key: "approved_by",      name: "Approved By",      type: "single_line_text_field" }
      ]
    }) {
      metaobjectDefinition { type name }
      userErrors { field message }
    }
  }
`);

const hiErr = historyDef?.data?.metaobjectDefinitionCreate?.userErrors || [];
if (hiErr.length) {
  console.log('certificate_transfer_history errors:', hiErr.map(e => e.message).join(', '));
} else {
  console.log('✓ certificate_transfer_history definition created');
}
