const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://legxi.co/products/argentine-icons-24k-signature-series');
  await page.waitForLoadState('networkidle');
  
  // Wait for the grid
  await page.waitForSelector('.lgx-card');
  
  // Get initial values
  const urlBefore = page.url();
  const qtyBefore = await page.locator('.lgx-qty-val').nth(1).textContent();
  
  // Click on the second player's name exactly
  await page.locator('.lgx-card-name').nth(1).click();
  
  // Wait a moment for variant sync
  await page.waitForTimeout(1000);
  
  // Get final values
  const urlAfter = page.url();
  const qtyAfter = await page.locator('.lgx-qty-val').nth(1).textContent();
  
  console.log(JSON.stringify({
    urlBefore,
    urlAfter,
    qtyBefore,
    qtyAfter,
    variantChanged: urlBefore !== urlAfter
  }, null, 2));
  
  await browser.close();
})();
