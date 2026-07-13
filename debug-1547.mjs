import 'dotenv/config';

const STORE   = process.env.SHOPIFY_STORE;
const VERSION = process.env.SHOPIFY_API_VERSION;
const TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;
const H       = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

const r = await fetch(
  `https://${STORE}/admin/api/${VERSION}/orders.json?name=%231547&status=any&fields=id,name,note,line_items`,
  { headers: H }
);
const { orders } = await r.json();
const order = orders[0];

console.log('note raw bytes:');
for (const line of (order.note||'').split('\n')) {
  const bytes = [...line].map(c => `U+${c.codePointAt(0).toString(16).padStart(4,'0')} (${c})`);
  console.log(`  ${JSON.stringify(line)}`);
  // show chars around apostrophe
  const apos = bytes.filter(b => b.startsWith('U+002') || b.startsWith('U+201') || b.startsWith('U+2018') || b.startsWith('U+2019'));
  if (apos.length) console.log(`    special chars: ${apos.join(', ')}`);
}

console.log('\nline_items title chars:');
for (const li of order.line_items) {
  if (li.title.includes("2007")) {
    const bytes = [...li.title].map(c => `U+${c.codePointAt(0).toString(16).padStart(4,'0')} (${c})`);
    const apos = bytes.filter(b => !['U+0020','U+0027'].includes(b.split(' ')[0]) && b.startsWith('U+00') === false && b.startsWith('U+201') || b.startsWith('U+2019'));
    console.log(`  "${li.title}"`);
    if (apos.length) console.log(`  special chars: ${apos.join(', ')}`);

    // print every char code
    for (const b of bytes) {
      if (!b.includes('U+002') && !b.includes('U+0041') && !b.startsWith('U+004') && !b.startsWith('U+005') && !b.startsWith('U+006')) {
        // non-ASCII range or unusual
        console.log(`    ${b}`);
      }
    }
  }
}
