async function run() {
  const res = await fetch('https://legxi.co/pages/career?cb=' + Date.now());
  const text = await res.text();
  console.log('Noindex found:', text.includes('noindex'));
  const m = text.match(/<meta[^>]*name=["']robots["'][^>]*>/i);
  console.log('Robots tag:', m ? m[0] : 'None');
}
run();
