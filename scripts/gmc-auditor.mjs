import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const artifactsDir = 'C:\\\\Users\\\\DELL\\\\.gemini\\\\antigravity-ide\\\\brain\\\\f56d1834-897a-499a-841c-81141b86a24a';
const profileDir = path.join(process.cwd(), '.playwright-profile');

async function run() {
  console.log('Launching browser with authenticated profile...');
  
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    channel: 'chromium'
  });

  const page = context.pages()[0] || await context.newPage();
  
  console.log('Navigating to Google Merchant Center...');
  // Using the exact Account ID from your previous screenshot
  await page.goto('https://merchants.google.com/mc/items/needsattention?a=5642722734', { waitUntil: 'load', timeout: 60000 });
  
  console.log('Waiting for the Needs Attention dashboard to fully load...');
  await page.waitForTimeout(7000); 
  
  const screenshotPath = path.join(artifactsDir, 'gmc-diagnostics.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved to: ${screenshotPath}`);
  
  // Extract all the visible text on the page so the AI can read the errors
  const pageText = await page.evaluate(() => {
    // Try to grab text specifically from tables or main content areas if possible
    // Otherwise just grab the whole body to ensure we don't miss anything
    return document.body.innerText;
  });
  
  fs.writeFileSync(path.join(artifactsDir, 'gmc-errors.txt'), pageText);
  console.log('Page text successfully extracted for AI analysis.');
  
  await context.close();
  console.log('Audit complete.');
}

run().catch(console.error);
