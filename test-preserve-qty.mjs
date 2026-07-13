import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://legxi.co/products/argentine-icons-24k-signature-series', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  console.log('Clicking Julian Alvarez + button...');
  const cards = await page.$$('.lgx-card');
  const julianPlus = await cards[3].$('.lgx-plus');
  await julianPlus.click();
  
  await page.waitForTimeout(1000);

  const julianQty = await page.evaluate(() => {
    return document.querySelectorAll('.lgx-card')[3].querySelector('.lgx-qty-val').textContent;
  });
  console.log('Julian qty after + click:', julianQty);

  console.log('Clicking Enzo Fernandes name...');
  const enzoName = await cards[2].$('.lgx-card-name');
  await enzoName.click();
  
  await page.waitForTimeout(2000);
  
  const finalJulianQty = await page.evaluate(() => {
    return document.querySelectorAll('.lgx-card')[3].querySelector('.lgx-qty-val').textContent;
  });
  console.log('Final Julian qty after Enzo click:', finalJulianQty);
  
  await browser.close();
})();
