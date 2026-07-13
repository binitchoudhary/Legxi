import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';

const STORE   = process.env.SHOPIFY_STORE;
const TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const LIVE    = 150920200366;
const BASE    = `https://${STORE}/admin/api/${VERSION}`;
const HEADERS = { 'X-Shopify-Access-Token': TOKEN };

// Get all assets
const res = await fetch(`${BASE}/themes/${LIVE}/assets.json`, { headers: HEADERS });
const { assets } = await res.json();

// Filter product templates
const productTemplates = assets.filter(a =>
  a.key.startsWith('templates/product') && a.key.endsWith('.json')
);

console.log(`Found ${productTemplates.length} product templates. Checking each...\n`);

mkdirSync('live-templates', { recursive: true });

const results = [];

for (const asset of productTemplates) {
  const r = await fetch(`${BASE}/themes/${LIVE}/assets.json?asset[key]=${encodeURIComponent(asset.key)}`, { headers: HEADERS });
  const d = await r.json();
  const content = d.asset?.value || '';

  // Save locally
  const filename = asset.key.replace('templates/', '');
  writeFileSync(`live-templates/${filename}`, content);

  // Check for ownership button
  const hasOwnership = content.includes('APPLY FOR OWNERSHIP');
  const hasPopup     = content.includes('specialist-form-popup');
  const hasForm      = content.includes('#specialist-form');

  if (hasOwnership) {
    // Find the button block key
    const match = content.match(/"([^"]+)":\s*\{[^}]*"type":\s*"button"[^}]*"text":\s*"APPLY FOR OWNERSHIP"/s);
    const blockKey = match ? match[1] : '?';
    results.push({ file: asset.key, blockKey, hasPopup, hasForm });
    console.log(`✓ FOUND: ${asset.key} | block: ${blockKey} | hasPopup: ${hasPopup}`);
  }

  await new Promise(r => setTimeout(r, 520));
}

console.log(`\n--- SUMMARY ---`);
console.log(`Files with "APPLY FOR OWNERSHIP": ${results.length}`);
results.forEach(r => console.log(`  ${r.file} — block: ${r.blockKey} — popup already: ${r.hasPopup}`));
