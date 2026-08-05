import 'dotenv/config';
import * as cheerio from 'cheerio';

const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const STORE = process.env.SHOPIFY_STORE;
const VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';

async function queryGraphQL(query) {
  const res = await fetch(`https://${STORE}/admin/api/${VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query })
  });
  return (await res.json()).data;
}

async function checkUrl(url) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    const robots = $('meta[name="robots"]').attr('content') || 'None';
    return { url, status: res.status, robots };
  } catch(e) {
    return { url, error: e.message };
  }
}

async function checkRedirect(url) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    const location = res.headers.get('location') || 'None';
    return { url, status: res.status, location };
  } catch(e) {
    return { url, error: e.message };
  }
}

async function run() {
  console.log("=== CAREER PAGE METAFIELD ===");
  const q = `query {
    page(id: "gid://shopify/Page/115310756014") {
      metafield(namespace: "seo", key: "hidden") {
        value
      }
    }
  }`;
  const data = await queryGraphQL(q);
  console.log(JSON.stringify(data, null, 2));

  console.log("\\n=== CAREER PAGE LIVE STATUS ===");
  console.log(await checkUrl('https://legxi.co/pages/career'));

  console.log("\\n=== INTENTIONAL NOINDEX PAGES ===");
  const pages = [
    'https://legxi.co/pages/kp-account',
    'https://legxi.co/pages/registration-form',
    'https://legxi.co/pages/authentication',
    'https://legxi.co/pages/giveaway-quiz',
    'https://legxi.co/pages/afa-x-legxi-thank-you',
    'https://legxi.co/products/legxi-goat-collector-trio-set',
    'https://legxi.co/products/god-of-cricket-100-centuries-edition'
  ];
  for (const p of pages) {
    console.log(await checkUrl(p));
  }

  console.log("\\n=== REDIRECTS ===");
  const redirects = [
    'https://legxi.co/products/la-scaloneta-2026-squad-slot-02',
    'https://legxi.co/products/la-scaloneta-2022-squad-slot-01',
    'https://legxi.co/products/la-scaloneta-2026-squad-slot-01',
    'https://legxi.co/products/edition-1'
  ];
  for (const r of redirects) {
    console.log(await checkRedirect(r));
  }
}

run();
