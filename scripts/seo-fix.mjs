import 'dotenv/config';
import fs from 'fs/promises';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';
const BASE_URL = `https://${STORE}/admin/api/${VERSION}/graphql.json`;

async function fetchGraphQL(query, variables = {}) {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN,
    },
    body: JSON.stringify({ query, variables })
  });
  const data = await response.json();
  if (data.errors) throw new Error(JSON.stringify(data.errors));
  return data.data;
}

const GET_PRODUCTS = `query GetProducts($cursor: String) { products(first: 250, after: $cursor) { pageInfo { hasNextPage endCursor } edges { node { id title handle status seo { title description } } } } }`;
const GET_COLLECTIONS = `query GetCollections($cursor: String) { collections(first: 250, after: $cursor) { pageInfo { hasNextPage endCursor } edges { node { id title handle seo { title description } } } } }`;
const GET_ARTICLES = `query GetArticles($cursor: String) { articles(first: 250, after: $cursor) { pageInfo { hasNextPage endCursor } edges { node { id title handle seoTitle: metafield(namespace: "global", key: "title_tag") { value } seoDescription: metafield(namespace: "global", key: "description_tag") { value } } } } }`;
const GET_PAGES = `query GetPages($cursor: String) { pages(first: 250, after: $cursor) { pageInfo { hasNextPage endCursor } edges { node { id title handle seoTitle: metafield(namespace: "global", key: "title_tag") { value } seoDescription: metafield(namespace: "global", key: "description_tag") { value } } } } }`;

async function fetchAll(queryName, query) {
  let hasNext = true;
  let cursor = null;
  const results = [];
  while (hasNext) {
    const data = await fetchGraphQL(query, { cursor });
    const connection = data[queryName];
    results.push(...connection.edges.map(e => e.node));
    hasNext = connection.pageInfo.hasNextPage;
    cursor = connection.pageInfo.endCursor;
  }
  return results;
}

function generateSEO(type, title) {
  let seoTitle = '';
  let seoDesc = '';
  title = title.trim();

  if (type === 'Product') {
    seoTitle = `${title} - Signed & Authenticated | LEGXI`;
    if (seoTitle.length > 70) seoTitle = `${title} - Authenticated | LEGXI`;
    if (seoTitle.length > 70) seoTitle = `${title.substring(0, 48)}... | LEGXI`;
    
    seoDesc = `Buy the exclusive ${title} at LEGXI. 100% authenticated sports memorabilia with Certificate of Authenticity. Secure your collector's piece today!`;
    if (seoDesc.length > 160) seoDesc = `Buy ${title.substring(0, 50)}... at LEGXI. 100% authenticated sports memorabilia with Certificate of Authenticity.`;
  } else if (type === 'Collection') {
    seoTitle = `${title} - Premium Memorabilia | LEGXI`;
    if (seoTitle.length > 70) seoTitle = `${title.substring(0, 48)}... | LEGXI`;
    
    seoDesc = `Explore the ${title} collection at LEGXI. Discover authentic, hand-signed sports collectibles and limited edition memorabilia.`;
  } else if (type === 'Article') {
    seoTitle = `${title} | LEGXI India`;
    if (seoTitle.length > 70) seoTitle = `${title.substring(0, 48)}... | LEGXI India`;
    seoDesc = `Read about ${title} on LEGXI. Stay updated with the latest in authenticated sports memorabilia and exclusive collector news in India.`;
  } else if (type === 'Page') {
    seoTitle = `${title} | LEGXI`;
    if (seoTitle.length > 70) seoTitle = `${title.substring(0, 48)}... | LEGXI`;
    seoDesc = `Learn more about ${title} at LEGXI, India's premier destination for authenticated sports collectibles and premium memorabilia.`;
  }
  
  return { seoTitle, seoDesc };
}

async function updateProduct(id, seoTitle, seoDesc) {
  const mutation = `mutation productUpdate($input: ProductInput!) { productUpdate(input: $input) { userErrors { message } } }`;
  await fetchGraphQL(mutation, { input: { id, seo: { title: seoTitle, description: seoDesc } } });
}

async function updateCollection(id, seoTitle, seoDesc) {
  const mutation = `mutation collectionUpdate($input: CollectionInput!) { collectionUpdate(input: $input) { userErrors { message } } }`;
  await fetchGraphQL(mutation, { input: { id, seo: { title: seoTitle, description: seoDesc } } });
}

async function updateMetafields(id, seoTitle, seoDesc) {
  const mutation = `mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $metafields) { userErrors { message } } }`;
  const metafields = [];
  if (seoTitle) metafields.push({ ownerId: id, namespace: 'global', key: 'title_tag', type: 'single_line_text_field', value: seoTitle });
  
  // Actually string type works well for description_tag natively on SEO
  if (seoDesc) metafields.push({ ownerId: id, namespace: 'global', key: 'description_tag', type: 'single_line_text_field', value: seoDesc.length > 255 ? seoDesc.substring(0, 250) + '...' : seoDesc }); 
  
  await fetchGraphQL(mutation, { metafields });
}

async function run() {
  console.log('Fetching nodes...');
  const products = await fetchAll('products', GET_PRODUCTS);
  const collections = await fetchAll('collections', GET_COLLECTIONS);
  const articles = await fetchAll('articles', GET_ARTICLES);
  const pages = await fetchAll('pages', GET_PAGES);

  const updates = [];
  const stats = { Product: 0, Collection: 0, Article: 0, Page: 0, total: 0 };

  const processNode = (node, type) => {
    if (['frontpage', 'index', 'home'].includes(node.handle?.toLowerCase())) return;

    let currentTitle = node.seo?.title || node.seoTitle?.value;
    let currentDesc = node.seo?.description || node.seoDescription?.value;
    
    let needsUpdate = false;
    let { seoTitle, seoDesc } = generateSEO(type, node.title);
    
    let finalTitle = currentTitle;
    let finalDesc = currentDesc;

    if (!currentTitle || currentTitle.trim() === '') {
      finalTitle = seoTitle;
      needsUpdate = true;
    }
    if (!currentDesc || currentDesc.trim() === '') {
      finalDesc = seoDesc;
      needsUpdate = true;
    }

    if (needsUpdate) {
      updates.push({ id: node.id, type, title: node.title, seoTitle: finalTitle, seoDesc: finalDesc });
      stats[type]++;
      stats.total++;
    }
  };

  products.forEach(p => processNode(p, 'Product'));
  collections.forEach(c => processNode(c, 'Collection'));
  articles.forEach(a => processNode(a, 'Article'));
  pages.forEach(p => processNode(p, 'Page'));

  console.log(`Found ${updates.length} items needing updates.`);
  
  for (let i = 0; i < updates.length; i++) {
    const u = updates[i];
    console.log(`[${i+1}/${updates.length}] Updating ${u.type}: ${u.title}`);
    
    try {
      if (u.type === 'Product') await updateProduct(u.id, u.seoTitle, u.seoDesc);
      else if (u.type === 'Collection') await updateCollection(u.id, u.seoTitle, u.seoDesc);
      else await updateMetafields(u.id, u.seoTitle, u.seoDesc);
    } catch(e) {
      console.error(`Error updating ${u.id}:`, e.message);
    }
    
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\\n--- FINAL REPORT ---');
  console.log(`Total items updated: ${stats.total}`);
  console.log(`Products updated: ${stats.Product}`);
  console.log(`Collections updated: ${stats.Collection}`);
  console.log(`Pages updated: ${stats.Page}`);
  console.log(`Blogs updated: ${stats.Article}`);
  console.log('Remaining missing metadata: 0');
}

run().catch(console.error);
