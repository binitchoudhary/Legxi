const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function check(urlStr) {
  try {
    const res = await fetch(urlStr, {
      method: 'GET',
      headers: { 'User-Agent': UA },
      redirect: 'manual' // We want to see the 301/302 status
    });
    return { status: res.status, location: res.headers.get('location') };
  } catch (err) {
    return { status: 500, error: err.message };
  }
}

async function main() {
  const urls = [
    'http://legxi.co/',
    'http://www.legxi.co/',
    'https://www.legxi.co/'
  ];
  
  console.log("Testing generic redirects:");
  for (const u of urls) {
    const res = await check(u);
    console.log(`[TEST] ${u} -> HTTP ${res.status} Location: ${res.location}`);
  }
}
main();
