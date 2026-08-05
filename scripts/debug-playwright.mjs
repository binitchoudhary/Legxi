import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://legxi.co/products/campeones-world-cup-2022-edition');
  const meta = await page.evaluate(() => document.querySelector('meta[name="description"]').getAttribute('content'));
  console.log('LIVE: ', meta);
  console.log('EXPECTED:', "Commemorate Argentina's historic victory with this exclusive Campeónes World Cup 2022 Edition Framed Art. Premium glass protection included.");
  console.log('MATCH:', meta.includes("Commemorate Argentina's historic victory"));
  await browser.close();
})();
