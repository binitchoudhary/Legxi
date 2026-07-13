import 'dotenv/config';

const STORE   = process.env.SHOPIFY_STORE;
const TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || '2025-10';
const BASE    = `https://${STORE}/admin/api/${VERSION}`;
const HEADERS = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

async function shopify(path, method = 'GET', body = null) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ── Create a page if it doesn't already exist ──────────────────────────────────
async function ensurePage(title, handle, templateSuffix) {
  // Check if page exists
  const existing = await shopify(`/pages.json?handle=${handle}&fields=id,handle,title`);
  if (existing.pages && existing.pages.length > 0) {
    console.log(`✓ Page "${handle}" already exists (id: ${existing.pages[0].id})`);
    return existing.pages[0];
  }

  const res = await shopify('/pages.json', 'POST', {
    page: {
      title,
      handle,
      template_suffix: templateSuffix,
      published: true,
      body_html: '',
    },
  });

  if (res.page) {
    console.log(`✓ Created page "${handle}" (id: ${res.page.id})`);
    return res.page;
  } else {
    console.error(`✗ Failed to create page "${handle}":`, JSON.stringify(res.errors || res));
    return null;
  }
}

// ── Create webhook if it doesn't already exist ─────────────────────────────────
async function ensureWebhook(topic, address) {
  const existing = await shopify(`/webhooks.json?topic=${topic}&fields=id,topic,address`);
  const hooks    = existing.webhooks || [];

  const alreadyExists = hooks.find(h => h.address === address);
  if (alreadyExists) {
    console.log(`✓ Webhook "${topic}" → ${address} already exists (id: ${alreadyExists.id})`);
    return alreadyExists;
  }

  const res = await shopify('/webhooks.json', 'POST', {
    webhook: { topic, address, format: 'json' },
  });

  if (res.webhook) {
    console.log(`✓ Created webhook "${topic}" → ${address} (id: ${res.webhook.id})`);
    return res.webhook;
  } else {
    console.error(`✗ Failed to create webhook:`, JSON.stringify(res.errors || res));
    return null;
  }
}

async function main() {
  console.log(`\nStore: ${STORE}\n`);

  // ── Pages ──────────────────────────────────────────────────────────────────
  console.log('── Creating Shopify Pages ──────────────────────────────');
  await ensurePage('Certificate Transfer', 'ownership-transfer', 'ownership-transfer');
  await ensurePage('Certificate Admin',    'certificate-admin',  'certificate-admin');

  // ── Webhooks ───────────────────────────────────────────────────────────────
  console.log('\n── Creating Shopify Webhooks ───────────────────────────');
  const hook = await ensureWebhook('orders/paid', 'https://api-7zal2ngszq-uc.a.run.app/transfer/webhook');

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`
Done!

  Customer transfer portal: https://${STORE}/pages/ownership-transfer
  Admin panel:              https://${STORE}/pages/certificate-admin
`);

  if (hook) {
    console.log(`  ⚠  Copy the webhook signing secret from Shopify Admin → Settings → Notifications → Webhooks`);
    console.log(`     Add it to Cloud Run as: SHOPIFY_WEBHOOK_SECRET=<secret>\n`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
