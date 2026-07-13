import https from 'https';

const urls = [
  'https://legxi.co/products/arsdeep-singh-hand-signed-cricket-ball-limited-edition',
  'https://legxi.co/products/campeones-world-cup-2022-edition',
  'https://legxi.co/products/argentine-icons-24k-signature-series',
];

function check(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html'
      },
      timeout: 15000
    }, (res) => {
      let data = '';
      const maxSize = 50000;
      res.on('data', chunk => { data += chunk; if (data.length > maxSize) req.destroy(); });
      res.on('end', () => {
        const result = {
          url,
          status: res.statusCode,
          location: res.headers.location || null,
          'x-robots-tag': res.headers['x-robots-tag'] || null,
          'content-type': res.headers['content-type'],
        };
        const metaRobots = data.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i);
        result['meta-robots'] = metaRobots ? metaRobots[1] : null;
        const canon = data.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i);
        result.canonical = canon ? canon[1] : null;
        result.isNoindex = data.includes('content="noindex"') || data.includes("content='noindex'");
        result.hasJSONLD = data.includes('application/ld+json');
        resolve(result);
      });
    });
    req.on('error', (e) => resolve({ url, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ url, error: 'timeout' }); });
  });
}

for (const url of urls) {
  console.log(`\n=== Checking ${url} ===`);
  const result = await check(url);
  console.log(JSON.stringify(result, null, 2));
}
