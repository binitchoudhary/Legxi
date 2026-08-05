import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const artifactsDir = 'C:\\\\Users\\\\DELL\\\\.gemini\\\\antigravity-ide\\\\brain\\\\f56d1834-897a-499a-841c-81141b86a24a';
const profileDir = path.join(process.cwd(), '.playwright-profile');

async function run() {
  console.log('Launching browser with persistent context...');
  
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    channel: 'chromium'
  });

  const page = context.pages()[0] || await context.newPage();
  
  console.log('Navigating to Google Merchant Center...');
  const response = await page.goto('https://merchants.google.com/', { waitUntil: 'networkidle' });
  
  console.log('\\n--- Browser Diagnostics ---');
  console.log('Browser Version:', context.browser() ? context.browser().version() : 'Chromium Persistent Context (151.0)');
  console.log('Current URL:', page.url());
  console.log('HTTP Status:', response ? response.status() : 'N/A');
  
  const screenshotPath = path.join(artifactsDir, 'browser-start.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved to: ${screenshotPath}`);
  
  console.log('Browser is now open and pausing for manual interaction if needed.');
  console.log('Press Ctrl+C to terminate or close the browser window to end the session.');
  
  // Wait indefinitely or until closed
  await page.waitForEvent('close', { timeout: 0 });
  await context.close();
}

run().catch(console.error);
