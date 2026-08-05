const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'screenshots', 'phase4');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const PAGES = [
  { name: 'active', url: 'http://127.0.0.1:3000/auctions/active' },
  { name: 'upcoming', url: 'http://127.0.0.1:3000/auctions/upcoming' },
  { name: 'ended', url: 'http://127.0.0.1:3000/auctions/ended' },
  { name: 'unknown-layout', url: 'http://127.0.0.1:3000/auctions/unknown-layout' },
  { name: 'missing-story', url: 'http://127.0.0.1:3000/auctions/missing-story' },
  { name: 'missing-timeline', url: 'http://127.0.0.1:3000/auctions/missing-timeline' },
  { name: 'unknown-module', url: 'http://127.0.0.1:3000/auctions/unknown-module' }
];

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  
  const results = [];

  for (const target of PAGES) {
    console.log(`\n\n=== Validating ${target.name} ===`);
    const page = await context.newPage();
    
    const logs = [];
    const errors = [];
    
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      logs.push(`[${type}] ${text}`);
      if (type === 'error' || text.toLowerCase().includes('hydrat')) {
        errors.push(text);
      }
    });
    
    page.on('pageerror', error => {
      errors.push(`PageError: ${error.message}`);
    });

    let httpStatus = 0;
    const networkLog = [];
    page.on('response', response => {
      const url = response.url();
      if (url === target.url) {
        httpStatus = response.status();
      }
      // Filter out Next.js prefetches for hall-of-fame and story
      if (!url.includes('/hall-of-fame') && !url.includes('/story')) {
        networkLog.push(`- ${url} [${response.status()}] (${response.request().resourceType()})`);
      }
    });

    console.log(`Navigating to ${target.url}...`);
    try {
      const response = await page.goto(target.url, { waitUntil: 'load', timeout: 30000 });
      if (!httpStatus && response) {
        httpStatus = response.status();
      }
      
      // Let React render completely
      await page.waitForTimeout(5000);
      
      const filePath = path.join(OUTPUT_DIR, `${target.name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`Screenshot saved to ${filePath}`);
      
      results.push({
        url: target.url,
        status: httpStatus,
        screenshot: filePath,
        logs,
        errors
      });
      
      console.log(`Status: ${httpStatus}`);
      console.log(`Errors/Warnings: ${errors.length ? errors.join(' | ') : 'None'}`);
      console.log(`Network Requests:\n${networkLog.join('\n')}`);
      
    } catch (err) {
      console.error(`Failed to capture ${target.name}:`, err.message);
    }
    await page.close();
  }
  
  await browser.close();
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'validation-results.json'), JSON.stringify(results, null, 2));
  console.log('\n\nValidation complete. Results saved to validation-results.json');
}

capture().catch(console.error);
