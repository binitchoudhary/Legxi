const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 375, height: 812 }
};

const PAGES = [
  { name: 'home', url: 'http://localhost:3000/' },
  { name: 'auctions_list', url: 'http://localhost:3000/auctions' },
  { name: 'auction_detail', url: 'http://localhost:3000/auctions/01JDH8ZBQ8M8M0000000000000' },
  { name: 'login', url: 'http://localhost:3000/login' }
];

async function capture() {
  const browser = await chromium.launch({ headless: true });
  
  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    
    for (const target of PAGES) {
      console.log(`Capturing ${target.name} on ${device}...`);
      try {
        await page.goto(target.url, { waitUntil: 'networkidle', timeout: 30000 });
        // Let animations settle
        await page.waitForTimeout(2000);
        
        const filePath = path.join(OUTPUT_DIR, `${target.name}_${device}.png`);
        await page.screenshot({ path: filePath, fullPage: true });
      } catch (err) {
        console.error(`Failed to capture ${target.name}:`, err.message);
      }
    }
    await context.close();
  }
  
  await browser.close();
  console.log('Screenshots captured successfully.');
}

capture().catch(console.error);
