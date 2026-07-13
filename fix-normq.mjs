import { readFileSync, writeFileSync } from 'fs';

const src = readFileSync('workbook-audit.mjs', 'utf8');

// The correct normQ — all characters in the regex are \uXXXX escapes (pure ASCII source)
const fixedNormQ =
`// Normalise Unicode smart-quotes to ASCII equivalents -- for comparison only.
// Uses \\uXXXX escapes so characters are never corrupted by editors or copy-paste.
const normQ = s =>
  s.replace(/[\\u2018\\u2019\\u201A\\u201B]/g, "'")
   .replace(/[\\u201C\\u201D\\u201E\\u201F]/g, '"');`;

// Find and replace the entire normQ block (from the comment through the semicolon)
const normQPattern = /\/\/ Normalise Unicode[\s\S]*?\.replace\([^)]+\);/;
const match = src.match(normQPattern);
if (!match) {
  console.error('Could not find normQ block. Showing lines 66-75:');
  src.split('\n').slice(65, 75).forEach((l, i) => console.log(i+66, JSON.stringify(l)));
  process.exit(1);
}
console.log('Found block:', JSON.stringify(match[0].slice(0, 80)));

const newSrc = src.replace(normQPattern, fixedNormQ);
writeFileSync('workbook-audit.mjs', newSrc, 'utf8');
console.log('Patched. Verifying...');

// Verify the fix
const verify = readFileSync('workbook-audit.mjs', 'utf8');
const normQDef = verify.match(/const normQ[\s\S]*?;/)[0];
console.log('New normQ:', normQDef);

// Quick test
const normQ = s =>
  s.replace(/[‘’‚‛]/g, "'")
   .replace(/[“”„‟]/g, '"');

const testRight = '2007 : The Birth of India’s T20 Era';  // U+2019
const testLeft  = '2007 : The Birth of India\'s T20 Era';      // U+0027
console.log('\nTest U+2019 → U+0027:', normQ(testRight) === normQ(testLeft) ? 'PASS' : 'FAIL');
