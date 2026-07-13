import 'dotenv/config';

const STORE   = process.env.SHOPIFY_STORE;
const TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || '2024-04';

async function gql(query, variables = {}) {
  const res = await fetch(`https://${STORE}/admin/api/${VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

const CREATE_DEFINITION = `
  mutation CreateDef($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition { id type name }
      userErrors { field message }
    }
  }
`;

const fields = [
  { key: 'certificate_id',        name: 'Certificate ID',        type: 'single_line_text_field', required: true },
  { key: 'edition_number',        name: 'Edition Number',        type: 'single_line_text_field', required: true },
  { key: 'product_title',         name: 'Product Title',         type: 'single_line_text_field' },
  { key: 'edition_type',          name: 'Edition Type',          type: 'single_line_text_field', description: 'artisan | signed' },
  { key: 'order_id',              name: 'Original Order ID',     type: 'single_line_text_field' },
  { key: 'original_owner_name',   name: 'Original Owner Name',   type: 'single_line_text_field' },
  { key: 'original_owner_phone',  name: 'Original Owner Phone',  type: 'single_line_text_field' },
  { key: 'original_owner_email',  name: 'Original Owner Email',  type: 'single_line_text_field' },
  { key: 'current_owner_name',    name: 'Current Owner Name',    type: 'single_line_text_field' },
  { key: 'current_owner_phone',   name: 'Current Owner Phone',   type: 'single_line_text_field' },
  { key: 'current_owner_email',   name: 'Current Owner Email',   type: 'single_line_text_field' },
  { key: 'transfer_count',        name: 'Transfer Count',        type: 'number_integer' },
  { key: 'transfer_status',       name: 'Transfer Status',       type: 'single_line_text_field', description: 'active | payment_pending | pending | approved | rejected' },
  { key: 'pending_to_name',       name: 'Pending To Name',       type: 'single_line_text_field' },
  { key: 'pending_to_phone',      name: 'Pending To Phone',      type: 'single_line_text_field' },
  { key: 'pending_to_email',      name: 'Pending To Email',      type: 'single_line_text_field' },
  { key: 'pending_order_id',      name: 'Pending Order ID',      type: 'single_line_text_field' },
  { key: 'transfer_reason',       name: 'Transfer Reason',       type: 'multi_line_text_field' },
  { key: 'created_at',            name: 'Created At',            type: 'date_time' },
  { key: 'updated_at',            name: 'Updated At',            type: 'date_time' },
];

const historyFields = [
  { key: 'certificate_id',  name: 'Certificate ID',       type: 'single_line_text_field', required: true },
  { key: 'edition_number',  name: 'Edition Number',       type: 'single_line_text_field' },
  { key: 'old_owner_name',  name: 'Previous Owner Name',  type: 'single_line_text_field' },
  { key: 'old_owner_phone', name: 'Previous Owner Phone', type: 'single_line_text_field' },
  { key: 'new_owner_name',  name: 'New Owner Name',       type: 'single_line_text_field' },
  { key: 'new_owner_phone', name: 'New Owner Phone',      type: 'single_line_text_field' },
  { key: 'transfer_fee',    name: 'Transfer Fee',         type: 'single_line_text_field' },
  { key: 'transfer_date',   name: 'Transfer Date',        type: 'date_time' },
  { key: 'approved_by',     name: 'Approved By',          type: 'single_line_text_field' },
];

async function createDefinition(type, name, fieldDefinitions) {
  const res = await gql(CREATE_DEFINITION, { definition: { type, name, fieldDefinitions } });
  const result = res?.data?.metaobjectDefinitionCreate;
  if (result?.userErrors?.length) {
    const alreadyExists = result.userErrors.some(e => e.message.toLowerCase().includes('already'));
    if (alreadyExists) {
      console.log(`✓ "${type}" already exists — skipped.`);
      return;
    }
    throw new Error(result.userErrors.map(e => e.message).join(', '));
  }
  const def = result?.metaobjectDefinition;
  if (def) console.log(`✓ Created: ${def.type} (${fieldDefinitions.length} fields)`);
}

async function main() {
  console.log('\nCreating Shopify Metaobject definitions...\n');

  await createDefinition('certificate_ownership',       'Certificate Ownership',       fields);
  await createDefinition('certificate_transfer_history','Certificate Transfer History', historyFields);

  console.log('\nDone. Both metaobject types are ready.\n');
  console.log('  certificate_ownership        — tracks current owner per certificate');
  console.log('  certificate_transfer_history — immutable log of every approved transfer\n');
}

main().catch(err => { console.error(err); process.exit(1); });
