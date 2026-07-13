import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://legxi.co/products/argentine-icons-24k-signature-series');
  await page.waitForLoadState('networkidle');

  // get initial quantity of Enzo
  const initialQty = await page.evaluate(() => {
    return document.querySelectorAll('.lgx-card')[2].querySelector('.lgx-qty-val').textContent;
  });
  console.log('Initial qty:', initialQty);

  console.log('Clicking Enzo Fernandes name...');
  const cards = await page.$$('.lgx-card');
  const enzoCard = cards[2];
  const nameEl = await enzoCard.$('.lgx-card-name');
  await nameEl.click();
  
  await page.waitForTimeout(2000);
  
  const finalQty = await page.evaluate(() => {
    return document.querySelectorAll('.lgx-card')[2].querySelector('.lgx-qty-val').textContent;
  });
  console.log('Final qty:', finalQty);
  
  if (finalQty === '1') {
      console.log('REPRODUCED! Qty became 1. Taking snapshot...');
  } else {
      console.log('NOT REPRODUCED. Qty is still', finalQty);
  }
  
  await browser.close();
})();
