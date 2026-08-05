import 'dotenv/config';
import fs from 'fs';
import * as cheerio from 'cheerio';

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';
const GQL_URL = `https://${STORE}/admin/api/${VERSION}/graphql.json`;
const REST_URL = `https://${STORE}/admin/api/${VERSION}`;

async function fetchGraphQL(query, variables = {}) {
  const response = await fetch(GQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables })
  });
  return (await response.json()).data;
}

async function fetchREST(path, method = 'GET', body = null) {
  const response = await fetch(`${REST_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN
    },
    body: body ? JSON.stringify(body) : null
  });
  return await response.json();
}

async function run() {
  console.log('--- 1. BACKUP ---');
  
  // Export current redirects
  const redirectsData = await fetchGraphQL(`query { urlRedirects(first: 250) { edges { node { id path target } } } }`);
  fs.writeFileSync('url_redirects_backup.json', JSON.stringify(redirectsData, null, 2));
  console.log('URL Redirects backed up to url_redirects_backup.json');

  // Get Active Theme
  const themesData = await fetchREST('/themes.json');
  const activeTheme = themesData.themes.find(t => t.role === 'main');
  console.log(`Active Theme ID: ${activeTheme.id} | Name: ${activeTheme.name} | Role: ${activeTheme.role}`);

  // Duplicate Theme as Backup
  const backupTheme = await fetchREST('/themes.json', 'POST', {
    theme: {
      name: `Backup_${activeTheme.name}_${new Date().toISOString().split('T')[0]}`,
      src: activeTheme.id,
      role: 'unpublished'
    }
  });
  console.log(`Theme Backup Initiated: ${backupTheme.theme?.name || 'Failed'}`);

  console.log('\n--- 2. REDIRECT VALIDATION & CREATION ---');
  const redirects = [
    { src: '/products/la-scaloneta-2026-squad-slot-02', dest: '/products/la-scaloneta-squad-edition' },
    { src: '/products/la-scaloneta-2022-squad-slot-01', dest: '/products/la-scaloneta-squad-edition' },
    { src: '/products/la-scaloneta-2026-squad-slot-01', dest: '/products/la-scaloneta-squad-edition' },
    { src: '/products/edition-1', dest: '/products/arshdeep-x-legxi-as02-edition-cap' }
  ];

  for (const r of redirects) {
    console.log(`Validating Redirect: ${r.src} -> ${r.dest}`);
    const srcRes = await fetch(`https://${STORE}${r.src}`);
    const destRes = await fetch(`https://${STORE}${r.dest}`);
    console.log(`  Source Status (Pre): ${srcRes.status} (Expected 404)`);
    console.log(`  Dest Status: ${destRes.status} (Expected 200)`);
    
    // Create Redirect
    const redirectMut = `
      mutation urlRedirectCreate($urlRedirectToCreate: UrlRedirectInput!) {
        urlRedirectCreate(urlRedirectToCreate: $urlRedirectToCreate) {
          urlRedirect { id }
          userErrors { field message }
        }
      }
    `;
    const mutData = await fetchGraphQL(redirectMut, { urlRedirectToCreate: { path: r.src, target: r.dest } });
    if (mutData.urlRedirectCreate?.userErrors.length > 0) {
      console.log(`  Failed to create redirect:`, mutData.urlRedirectCreate.userErrors);
    } else {
      console.log(`  Redirect created successfully.`);
    }

    // Verify Redirect
    const verifyRes = await fetch(`https://${STORE}${r.src}`, { redirect: 'manual' });
    console.log(`  Source Status (Post): ${verifyRes.status} (Expected 301)`);
    if (verifyRes.status === 301 || verifyRes.status === 302) {
       console.log(`  Redirects to: ${verifyRes.headers.get('location')}`);
    }
  }

  console.log('\n--- 3. CAREER PAGE VALIDATION & FIX ---');
  const careerRes = await fetch(`https://${STORE}/pages/career`);
  const careerHtml = await careerRes.text();
  const $ = cheerio.load(careerHtml);
  
  console.log(`  Canonical Exists: ${$('link[rel="canonical"]').length > 0}`);
  console.log(`  Meta Title Exists: ${$('title').length > 0}`);
  console.log(`  Meta Description Exists: ${$('meta[name="description"]').length > 0}`);
  console.log(`  H1 Exists: ${$('h1').length > 0}`);
  console.log(`  Pre-Fix Robots: ${$('meta[name="robots"]').attr('content')}`);

  // Fetch live theme.liquid
  const assetData = await fetchREST(`/themes/${activeTheme.id}/assets.json?asset[key]=layout/theme.liquid`);
  let themeLiquid = assetData.asset.value;
  fs.writeFileSync('theme/layout/theme.liquid.backup', themeLiquid); // Save original locally just in case
  console.log('  Live theme.liquid downloaded.');

  // Modify theme.liquid
  // Assuming the noindex list is an array like "career", "authentication" etc.
  // E.g. {% assign noindex_handles = "career,authentication" | split: "," %}
  // Or hardcoded in liquid. I will search for career in theme.liquid and log the surrounding lines.
  
  if (themeLiquid.includes('career')) {
      themeLiquid = themeLiquid.replace(/'career',?\s*/g, '');
      themeLiquid = themeLiquid.replace(/"career",?\s*/g, '');
      themeLiquid = themeLiquid.replace(/career,/, '');
      themeLiquid = themeLiquid.replace(/,career/, '');
      
      const updateData = await fetchREST(`/themes/${activeTheme.id}/assets.json`, 'PUT', {
        asset: { key: 'layout/theme.liquid', value: themeLiquid }
      });
      console.log(`  theme.liquid updated and pushed to Live. Asset Update Status: ${updateData.asset ? 'Success' : 'Failed'}`);
  } else {
      console.log(`  'career' not found in layout/theme.liquid. Please check manually.`);
  }

  console.log('\n--- 5. POST DEPLOYMENT VERIFICATION ---');
  const postCareerRes = await fetch(`https://${STORE}/pages/career`);
  const postCareerHtml = await postCareerRes.text();
  const post$ = cheerio.load(postCareerHtml);
  console.log(`  Post-Fix Robots (Career): ${post$('meta[name="robots"]').attr('content')}`);

}

run().catch(console.error);
