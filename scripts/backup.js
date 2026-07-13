import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const BASE_URL = `https://${STORE}/admin/api/${VERSION}`;

const HEADERS = {
  'X-Shopify-Access-Token': TOKEN,
  'Content-Type': 'application/json',
};

const OUT_DIR = join(process.cwd(), 'backup');
mkdirSync(OUT_DIR, { recursive: true });

async function fetchAll(endpoint, key, params = '') {
  let url = `${BASE_URL}/${endpoint}.json?limit=250${params}`;
  let all = [];

  while (url) {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`${endpoint}: HTTP ${res.status} - ${await res.text()}`);
    const data = await res.json();
    all = all.concat(data[key] ?? []);

    const link = res.headers.get('link') ?? '';
    const next = link.match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
  }

  return all;
}

async function save(name, data) {
  const file = join(OUT_DIR, `${name}.json`);
  writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`✓ ${name}: ${data.length} records → backup/${name}.json`);
}

const RESOURCES = {
  products:    () => fetchAll('products',    'products',    '&status=any'),
  orders:      () => fetchAll('orders',      'orders',      '&status=any'),
  customers:   () => fetchAll('customers',   'customers'),
  collections: async () => {
    const custom = await fetchAll('custom_collections', 'custom_collections');
    const smart  = await fetchAll('smart_collections',  'smart_collections');
    return [...custom, ...smart];
  },
  metafields:  () => fetchAll('metafields',  'metafields'),
  pages:       () => fetchAll('pages',       'pages'),
  blogs:       () => fetchAll('blogs',       'blogs'),
  redirects:   () => fetchAll('redirects',   'redirects'),
  locations:   () => fetchAll('locations',   'locations'),
  inventory:   () => fetchAll('inventory_items', 'inventory_items'),
};

async function run() {
  const arg = process.argv[2] ?? 'all';
  const targets = arg === 'all' ? Object.keys(RESOURCES) : [arg];

  console.log(`\nBacking up: ${targets.join(', ')}\nStore: ${STORE}\n`);

  for (const target of targets) {
    if (!RESOURCES[target]) {
      console.error(`Unknown resource: ${target}. Available: ${Object.keys(RESOURCES).join(', ')}`);
      continue;
    }
    try {
      const data = await RESOURCES[target]();
      await save(target, data);
    } catch (err) {
      console.error(`✗ ${target}: ${err.message}`);
    }
  }

  console.log('\nBackup complete! Files saved to /backup folder.');
}

run();
