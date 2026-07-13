import fs from 'fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function testRedirect(urlStr) {
  try {
    const res = await fetch(urlStr, {
      method: 'GET',
      headers: { 'User-Agent': UA },
      redirect: 'follow'
    });
    return { status: res.status, finalUrl: res.url, redirected: res.redirected };
  } catch (err) {
    return { status: 500, finalUrl: urlStr, error: err.message };
  }
}

async function main() {
  const mappings = JSON.parse(fs.readFileSync('redirect_mapping.json', 'utf8'));
  console.log(`Testing ${mappings.length} URL redirects on Shopify...\n`);
  
  let failed = 0;
  for (const m of mappings) {
    const fullSource = `https://legxi.co${m.source}`;
    const result = await testRedirect(fullSource);
    
    if (result.status === 200) {
      console.log(`[PASS] ${m.source} -> ${result.finalUrl} (HTTP 200)`);
    } else {
      console.log(`[FAIL] ${m.source} -> ${result.finalUrl} (HTTP ${result.status})`);
      failed++;
    }
  }
  
  console.log(`\nRedirect Testing Complete. Passes: ${mappings.length - failed}, Fails: ${failed}`);
}

main().catch(console.error);
