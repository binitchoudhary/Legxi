import fs from 'fs';
import 'dotenv/config';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION;
const H = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

async function fetchGraphQL(query, variables = {}) {
  const res = await fetch(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json();
  if (json.errors) {
    console.error('GraphQL Error:', json.errors);
    return null;
  }
  return json.data;
}

async function checkSeoHidden() {
  console.log("Checking SEO Metafields for NoIndex URLs...");
  const handles = [
    'legxi-goat-collector-trio-set',
    'god-of-cricket-100-centuries-edition',
    'shreyas-iyer-hand-signed-white-gold-plated-artwork'
  ];
  
  for (const handle of handles) {
    const q = `
    query {
      productByHandle(handle: "${handle}") {
        id
        title
        seo {
          title
          description
        }
        metafield(namespace: "seo", key: "hidden") {
          value
        }
      }
    }`;
    const data = await fetchGraphQL(q);
    const prod = data?.productByHandle;
    if (prod) {
      console.log(`Product: ${prod.title}`);
      console.log(`SEO Hidden: ${prod.metafield ? prod.metafield.value : 'Not set (visible)'}`);
    } else {
      console.log(`Product ${handle} not found!`);
    }
  }

  const pageHandles = ['career', 'afa-x-legxi-thank-you', 'authentication'];
  for (const handle of pageHandles) {
    const q = `
    query {
      pageByHandle(handle: "${handle}") {
        id
        title
        seo {
          title
          description
        }
        metafield(namespace: "seo", key: "hidden") {
          value
        }
      }
    }`;
    const data = await fetchGraphQL(q);
    const page = data?.pageByHandle;
    if (page) {
      console.log(`Page: ${page.title}`);
      console.log(`SEO Hidden: ${page.metafield ? page.metafield.value : 'Not set (visible)'}`);
    } else {
      console.log(`Page ${handle} not found!`);
    }
  }
}

async function checkRobots() {
  console.log("\nFetching live robots.txt...");
  const res = await fetch(`https://${STORE}/robots.txt`);
  const text = await res.text();
  console.log(text.substring(0, 1500) + (text.length > 1500 ? '...\n[Truncated]' : ''));
}

async function main() {
  await checkSeoHidden();
  await checkRobots();
}

main();
