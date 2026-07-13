import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
  });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
    timezoneId: 'America/New_York'
  });
  const page = await ctx.newPage();
  // Remove webdriver property
  await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });
  
  await page.goto('https://5ci887-xv.myshopify.com/?preview_theme_id=152614928558', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(5000);
  const url = page.url(); const title = await page.title();
  console.log('URL:', url, '| Title:', title);
  const btn = await page.evaluate(() => { const e = document.querySelector('[aria-controls="cart-drawer"]'); return e ? 'FOUND' : 'NOT FOUND'; });
  console.log('Cart btn:', btn);
  await page.screenshot({ path: 'C:/Users/dell/AppData/Local/Temp/claude/c--Users-dell-Desktop-legxi/6bc3be1c-5f7f-45ef-8454-096c720e8a4f/scratchpad/cf-bypass.png' });
  await browser.close();
})();
