import fs from 'fs';
import 'dotenv/config';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION;
const H = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

async function createRedirect(path, target) {
  const url = `https://${STORE}/admin/api/${API_VERSION}/redirects.json`;
  const body = {
    redirect: {
      path: path,
      target: target
    }
  };
  
  const res = await fetch(url, {
    method: 'POST',
    headers: H,
    body: JSON.stringify(body)
  });
  
  if (res.status === 422) {
    const errorJson = await res.json();
    console.log(`[SKIPPED] ${path} -> ${target} (Already exists or invalid: ${JSON.stringify(errorJson.errors)})`);
  } else if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${path}`);
  } else {
    console.log(`[CREATED] ${path} -> ${target}`);
  }
}

async function main() {
  const mappings = JSON.parse(fs.readFileSync('redirect_mapping.json', 'utf8'));
  console.log(`Starting to create ${mappings.length} URL redirects on Shopify...`);
  
  for (const m of mappings) {
    await createRedirect(m.source, m.target);
  }
  
  console.log("\nFinished creating all URL redirects!");
}

main().catch(console.error);
