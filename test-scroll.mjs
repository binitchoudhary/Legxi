import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://legxi.co/products/argentine-icons-24k-signature-series', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Check which gallery image is currently visible in viewport
  let visibleIndex = await page.evaluate(() => {
    const carousel = document.querySelector('product-gallery .product-gallery__carousel');
    return carousel ? carousel.selectedScrollableIndex : -1;
  });
  console.log('Initial carousel selected index:', visibleIndex);

  console.log('Clicking Julian Alvarez card...');
  const cards = await page.$$('.lgx-card');
  const julianCard = cards[3];
  const julianName = await julianCard.$('.lgx-card-name');
  await julianName.click();
  
  await page.waitForTimeout(2000);
  
  visibleIndex = await page.evaluate(() => {
    const carousel = document.querySelector('product-gallery .product-gallery__carousel');
    return carousel ? carousel.selectedScrollableIndex : -1;
  });
  console.log('Carousel selected index after click:', visibleIndex);
  
  await browser.close();
})();
