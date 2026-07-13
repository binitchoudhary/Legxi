import { chromium } from 'playwright';
const STORE = 'https://5ci887-xv.myshopify.com';
const PREVIEW = '?preview_theme_id=152614928558';
const BASE = STORE + PREVIEW;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  
  // Dump all buttons and aria-controls
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, a[href*="cart"]')).map(el => ({
      tag: el.tagName,
      id: el.id,
      class: el.className.substring(0,60),
      aria: el.getAttribute('aria-controls') || el.getAttribute('aria-label') || '',
      href: el.getAttribute('href') || ''
    })).filter(b => b.id.toLowerCase().includes('cart') || b.aria.toLowerCase().includes('cart') || b.class.toLowerCase().includes('cart') || b.href.toLowerCase().includes('cart'));
  });
  console.log(JSON.stringify(buttons, null, 2));
  await browser.close();
})();
