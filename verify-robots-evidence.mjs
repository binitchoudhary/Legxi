import fs from 'fs';
import https from 'https';

const storeUrl = 'legxi.co';
const productHandle = 'legxi-magshield-argentina-pro-series';
const variantId = '48013043433646';
const countries = ['CZ', 'GB', 'DE', 'FR']; // Affected countries from CSV

// Shopify feed URLs structure for Markets
const testUrls = countries.map(c => `https://${storeUrl}/products/${productHandle}?variant=${variantId}&country=${c}`);

const robotsTxt = fs.readFileSync('live-robots.txt', 'utf16le');
console.log('=== ROBOTS.TXT RULES ===');
const lines = robotsTxt.split('\n');
const disallows = lines.filter(l => l.startsWith('Disallow:')).map(l => l.replace('Disallow: ', '').trim());
console.log(disallows);

function isBlocked(url) {
  const pathAndQuery = url.replace(`https://${storeUrl}`, '');
  for (const rule of disallows) {
    if (!rule) continue;
    
    let regexStr = rule.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '\\?');
    if (!regexStr.startsWith('.*')) {
      regexStr = '^' + regexStr;
    }
    const regex = new RegExp(regexStr);
    if (regex.test(pathAndQuery)) {
      return { blocked: true, rule };
    }
  }
  return { blocked: false };
}

console.log('\n=== ROBOTS.TXT BLOCKING TEST ===');
for (const url of testUrls) {
  const result = isBlocked(url);
  console.log(`${url} => Blocked: ${result.blocked} ${result.blocked ? `(Rule: ${result.rule})` : ''}`);
}

console.log('\n=== HTTP RESPONSE TEST (WITHOUT ROBOTS.TXT BLOCK) ===');
function checkHttp(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' } }, (res) => {
      resolve({ url, status: res.statusCode, location: res.headers.location });
      res.resume();
    }).on('error', e => resolve({ url, error: e.message }));
  });
}

(async () => {
  for (const url of testUrls) {
    const res = await checkHttp(url);
    console.log(`${url} => HTTP ${res.status} ${res.location ? `(Redirect to ${res.location})` : ''}`);
  }
})();
