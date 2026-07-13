import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://legxi.co/products/argentine-icons-24k-signature-series', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  console.log('Clicking Enzo Fernandes card...');
  const cards = await page.$$('.lgx-card');
  const enzoCard = cards[2];
  const nameEl = await enzoCard.$('.lgx-card-name');
  await nameEl.click();
  
  await page.waitForTimeout(2000);

  // Check gallery URL or image
  const galleryImage = await page.evaluate(() => {
    const img = document.querySelector('product-gallery img');
    return img ? img.src : null;
  });
  console.log('Gallery image:', galleryImage);
  
  const formDispatched = await page.evaluate(() => {
    // Check if variant:change is dispatched? We can't really unless we inject a listener.
    // Let's inject a listener on the document and click Julian Alvarez
    window.variantChangeFired = false;
    document.addEventListener('variant:change', () => window.variantChangeFired = true);
  });
  
  console.log('Clicking Julian Alvarez card...');
  const julianCard = cards[3];
  const julianName = await julianCard.$('.lgx-card-name');
  await julianName.click();
  
  await page.waitForTimeout(2000);
  
  const fired = await page.evaluate(() => window.variantChangeFired);
  console.log('Variant change fired?', fired);
  
  const activeClass = await page.evaluate(() => {
     return document.querySelectorAll('.lgx-card')[3].classList.contains('lgx-card--active');
  });
  console.log('Julian card active?', activeClass);
  
  await browser.close();
})();
