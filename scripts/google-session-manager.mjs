import { chromium } from 'playwright';
import path from 'path';

const profileDir = path.join(process.cwd(), '.playwright-profile');

async function run() {
  console.log('Launching Chromium with persistent profile:', profileDir);
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    channel: 'chromium',
  });

  const page = context.pages()[0] || await context.newPage();
  
  // 1. Check Google Search Console
  console.log('Navigating to Google Search Console...');
  await page.goto('https://search.google.com/search-console', { waitUntil: 'load', timeout: 60000 });
  
  let currentUrl = page.url();
  let gscAuthenticated = !currentUrl.includes('ServiceLogin') && !currentUrl.includes('accounts.google.com') && !currentUrl.includes('signin');

  if (!gscAuthenticated) {
    console.log('Authentication required for GSC. Please log in manually in the browser window.');
    console.log('Waiting up to 5 minutes for successful login navigation...');
    await page.waitForURL('**/search-console**', { timeout: 300000 }); 
    gscAuthenticated = true;
    console.log('GSC login successful.');
  } else {
    console.log('Already authenticated to GSC.');
  }

  // 2. Check Google Merchant Center
  console.log('Navigating to Google Merchant Center...');
  await page.goto('https://merchants.google.com/', { waitUntil: 'load', timeout: 60000 });
  
  currentUrl = page.url();
  let gmcAuthenticated = !currentUrl.includes('ServiceLogin') && !currentUrl.includes('accounts.google.com') && !currentUrl.includes('signin');

  if (!gmcAuthenticated) {
     console.log('Authentication required for GMC. Please log in manually.');
     await page.waitForURL('**/mc/**', { timeout: 300000 });
     gmcAuthenticated = true;
     console.log('GMC login successful.');
  } else {
     console.log('Already authenticated to GMC.');
  }
  
  // 3. Verification Report
  console.log('\n=== VERIFICATION REPORT ===');
  console.log('Final URL:', page.url());
  console.log('GSC Logged-in status:', gscAuthenticated ? 'VERIFIED' : 'FAILED');
  console.log('GMC Logged-in status:', gmcAuthenticated ? 'VERIFIED' : 'FAILED');
  console.log('Profile path:', profileDir);
  console.log('Browser version:', context.browser() ? context.browser().version() : 'Unknown');
  console.log('===========================\n');
  
  console.log('Session authenticated and saved. Closing browser...');
  await context.close();
}

run().catch(console.error);
