import fs from 'fs';

async function run() {
  const r = await fetch('https://legxi.co/products/campeones-world-cup-2022-edition');
  const html = await r.text();
  const matches = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/gi);
  console.log("Meta descriptions found on frontend:");
  console.log(matches);
}
run();
