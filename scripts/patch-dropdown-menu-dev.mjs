/**
 * Changes the nav menu drawer from a side-slide to a top dropdown.
 *
 * CSS: makes ::part(content) full-width and auto-height.
 * JS:  replaces all translateX slide animations with translateY dropdown animations.
 *
 * Pushes ONLY to dev theme for preview.
 */
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';

const STORE   = process.env.SHOPIFY_STORE;
const TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;
const DEV     = 152614928558;
const BASE    = `https://${STORE}/admin/api/${VERSION}`;
const HEADERS = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

async function push(key, value) {
  const res = await fetch(`${BASE}/themes/${DEV}/assets.json`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify({ asset: { key, value } }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(`✗ ${key}: ${JSON.stringify(d.errors)}`);
  console.log(`✓ pushed ${key}`);
  await new Promise(r => setTimeout(r, 800));
}

// ─── 1. Patch theme.css ──────────────────────────────────────────────────────

let css = readFileSync('theme/assets/theme.css', 'utf8');

// Backup
writeFileSync('backups/theme.css.ORIGINAL', css);

// Change max-width from 480px to 100% and height to auto
css = css.replace(
  `.menu-drawer::part(content) {
  width: 100%;
  max-width: 480px;
  height: calc(100vh - var(--menu-offset-top, 0px));
  border-block-start: 1px solid rgb(var(--border-color));
  background: inherit;
  color: inherit;
  grid-auto-rows: minmax(0, 1fr);
  display: grid;
  position: absolute;
  inset-block-start: 100%;
  inset-inline-start: 0;
  overflow: clip;
}`,
  `.menu-drawer::part(content) {
  width: 100%;
  max-width: 100%;
  height: auto;
  max-height: 80vh;
  border-block-start: 1px solid rgb(var(--border-color));
  background: inherit;
  color: inherit;
  grid-auto-rows: minmax(0, 1fr);
  display: grid;
  position: absolute;
  inset-block-start: 100%;
  inset-inline-start: 0;
  overflow: hidden;
  overflow-y: auto;
}`
);

// Fix the dvh fallback block too
css = css.replace(
  `@supports (height: 100dvh) {
  .menu-drawer::part(content) {
    height: calc(100dvh - var(--menu-offset-top, 0px));
  }
}`,
  `@supports (height: 100dvh) {
  .menu-drawer::part(content) {
    max-height: 80dvh;
  }
}`
);

writeFileSync('theme/assets/theme.css', css);
console.log('theme.css patched');

// ─── 2. Patch theme.js ───────────────────────────────────────────────────────

let js = readFileSync('theme/assets/theme.js', 'utf8');

// Backup
writeFileSync('backups/theme.js.ORIGINAL', js);

// Enter animation: translateX slide-from-left → translateY drop-from-top
js = js.replaceAll(
  `{ transform: ["translateX(calc(var(--transform-logical-flip) * -100%))", "translateX(0)"] }, { duration: 0.35, at: "<", ease: [0.2, 0.4, 0.2, 1] }`,
  `{ transform: ["translateY(-100%)", "translateY(0)"], opacity: [0, 1] }, { duration: 0.3, at: "<", ease: [0.2, 0.4, 0.2, 1] }`
);

// Leave animation: translateX slide-out-left → translateY slide-up-out
js = js.replaceAll(
  `{ transform: ["translateX(0)", "translateX(calc(var(--transform-logical-flip) * -100%))"] }, { duration: 0.25, ease: [0.645, 0.045, 0.355, 1] }`,
  `{ transform: ["translateY(0)", "translateY(-100%)"], opacity: [1, 0] }, { duration: 0.2, ease: [0.645, 0.045, 0.355, 1] }`
);

writeFileSync('theme/assets/theme.js', js);
console.log('theme.js patched');

// ─── 3. Push both to dev ─────────────────────────────────────────────────────

await push('assets/theme.css', css);
await push('assets/theme.js', js);

console.log('\nPreview (log into Shopify admin first):');
console.log('  https://5ci887-xv.myshopify.com?preview_theme_id=152614928558');
