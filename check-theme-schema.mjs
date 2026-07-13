import 'dotenv/config';
const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

async function restGet(path) {
  const res = await fetch(`https://${STORE}/admin/api/2024-10/${path}`, {
    headers: { 'X-Shopify-Access-Token': TOKEN }
  });
  return { status: res.status, data: await res.json() };
}

// Get microdata schema snippet
const { data: schemaData } = await restGet('themes/150920200366/assets.json');
const schemaFile = schemaData.assets?.find(a => a.key === 'snippets/microdata-schema.liquid');
if (schemaFile) {
  const { data: schemaContent } = await restGet(`themes/150920200366/assets.json?asset[key]=snippets/microdata-schema.liquid`);
  console.log('=== MICRODATA SCHEMA SNIPPET ===');
  // Just show first and last parts
  const content = schemaContent.asset?.value || '';
  const lines = content.split('\n');
  console.log(`Total lines: ${lines.length}`);
  console.log('First 20 lines:');
  for (let i = 0; i < Math.min(20, lines.length); i++) console.log(lines[i]);
  console.log('\nLast 20 lines:');
  for (let i = Math.max(0, lines.length - 20); i < lines.length; i++) console.log(lines[i]);
}

// Check theme.liquid for how product URLs are generated in the feed
console.log('\n=== CHECKING THEME.LIQUID FOR GOOGLE FEED SETTINGS ===');
const { data: themeLiquid } = await restGet('themes/150920200366/assets.json?asset[key]=layout/theme.liquid');
const tlContent = themeLiquid.asset?.value || '';
// Look for Google-related configurations
const googleLines = tlContent.split('\n').filter(l => l.toLowerCase().includes('google') || l.toLowerCase().includes('gmc') || l.toLowerCase().includes('merchant') || l.toLowerCase().includes('shopping'));
console.log(`Google-related lines: ${googleLines.length}`);
googleLines.forEach(l => console.log(`  ${l.trim()}`));
