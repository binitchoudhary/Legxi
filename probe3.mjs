import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  // Try legxi.co directly with preview theme
  await page.goto('https://legxi.co/?preview_theme_id=152614928558', { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(2000);
  const title = await page.title();
  const url = page.url();
  console.log('URL:', url, '| Title:', title);
  
  // Check for cart button
  const btn = await page.evaluate(() => {
    const el = document.querySelector('[aria-controls="cart-drawer"]');
    return el ? { tag: el.tagName, class: el.className, aria: el.getAttribute('aria-controls') } : null;
  });
  console.log('Cart btn:', JSON.stringify(btn));
  await page.screenshot({ path: 'C:/Users/dell/AppData/Local/Temp/claude/c--Users-dell-Desktop-legxi/6bc3be1c-5f7f-45ef-8454-096c720e8a4f/scratchpad/legxi-debug.png' });
  await browser.close();
})();
