import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://5ci887-xv.myshopify.com/?preview_theme_id=152614928558', { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(2000);
  const title = await page.title();
  const url = page.url();
  const html = await page.content();
  console.log('URL:', url);
  console.log('Title:', title);
  console.log('HTML excerpt:', html.substring(0, 500));
  await page.screenshot({ path: 'C:/Users/dell/AppData/Local/Temp/claude/c--Users-dell-Desktop-legxi/6bc3be1c-5f7f-45ef-8454-096c720e8a4f/scratchpad/page-debug.png' });
  await browser.close();
})();
