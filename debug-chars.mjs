import { readFileSync } from 'fs';

const src = readFileSync('workbook-audit.mjs', 'utf8');

// Check the 2007 line in SHEET_TABS
const m = src.match(/"2007[^"]+"/);
if (m) {
  console.log('2007 literal:', m[0]);
  for (const c of m[0]) {
    const cp = c.codePointAt(0);
    if (cp > 127) console.log(`  U+${cp.toString(16).toUpperCase().padStart(4,'0')} (${c})`);
  }
}

// Check the normQ definition characters
const normM = src.match(/normQ = s =>.*$/m);
if (normM) {
  console.log('\nnormQ chars:');
  for (const c of normM[0]) {
    const cp = c.codePointAt(0);
    if (cp > 127) console.log(`  U+${cp.toString(16).toUpperCase().padStart(4,'0')} (${c})`);
  }
}

// Also inline test
const normQ = s => s.replace(/[''‚‛]/g, "'").replace(/[""„‟]/g, '"');
const noteTitle = '2007 : The Birth of India’s T20 Era';
const tabTitle  = '2007 : The Birth of India's T20 Era';
console.log('\nnormQ(note):', JSON.stringify(normQ(noteTitle)));
console.log('normQ(tab) :', JSON.stringify(normQ(tabTitle)));
console.log('match?     :', normQ(noteTitle) === normQ(tabTitle));
