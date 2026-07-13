import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://legxi.co/products/argentine-icons-24k-signature-series', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  await page.evaluate(() => {
    window.eventsCaught = [];
    document.addEventListener('variant:change', (e) => {
        window.eventsCaught.push(e.detail);
    });
  });
  
  console.log('Clicking Julian Alvarez card...');
  const cards = await page.$$('.lgx-card');
  const julianCard = cards[3];
  const julianName = await julianCard.$('.lgx-card-name');
  await julianName.click();
  
  await page.waitForTimeout(2000);
  
  const events = await page.evaluate(() => window.eventsCaught);
  console.log('Events caught:', JSON.stringify(events, null, 2));
  
  await browser.close();
})();
