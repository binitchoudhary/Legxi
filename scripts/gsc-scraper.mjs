import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const profileDir = path.join(process.cwd(), '.playwright-profile');
const artifactsDir = 'C:\\\\Users\\\\DELL\\\\.gemini\\\\antigravity-ide\\\\brain\\\\f56d1834-897a-499a-841c-81141b86a24a';
const propertyUrl = encodeURIComponent('sc-domain:legxi.co'); // Using domain property format, or https://legxi.co/ depending on how they verified. 
// We will use the fallback of just going to search-console and clicking or scraping.

async function run() {
  console.log('Launching Chromium for GSC Audit...');
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    channel: 'chromium',
  });

  const page = context.pages()[0] || await context.newPage();
  
  // Go to main GSC overview
  await page.goto('https://search.google.com/search-console', { waitUntil: 'load' });
  await page.waitForTimeout(5000); // let UI settle

  let report = '# Google Search Console Final Status\\n\\n';
  
  // Function to scrape page
  const scrapeSection = async (name) => {
    console.log(`Scraping ${name}...`);
    await page.waitForTimeout(3000); // let animations finish
    const text = await page.evaluate(() => {
      // try to get main content area if possible, otherwise body
      const main = document.querySelector('[role="main"]') || document.body;
      return main.innerText;
    });
    
    // Take screenshot
    const shotPath = path.join(artifactsDir, `gsc-${name.replace(/ /g, '-').toLowerCase()}.png`);
    await page.screenshot({ path: shotPath, fullPage: true });
    
    // Parse out some key phrases roughly
    const lines = text.split('\\n').filter(l => l.trim().length > 0).slice(0, 100);
    return lines.join('\\n');
  };

  // 1. Overview
  report += '## 1. Overview\\n```text\\n';
  report += await scrapeSection('Overview');
  report += '\\n```\\n\\n';
  
  // To avoid complex UI navigation which breaks, we will just dump the overview text and let the AI analyze it, 
  // as the overview contains cards for Indexing, Enhancements, and Core Web Vitals.
  
  // 2. Sitemaps
  console.log("Navigating to Sitemaps...");
  // Find sitemaps link in nav
  try {
    await page.getByRole('link', { name: /Sitemaps/i }).click();
    report += '## 2. Sitemaps\\n```text\\n';
    report += await scrapeSection('Sitemaps');
    report += '\\n```\\n\\n';
  } catch (e) {
    console.log("Could not click sitemaps");
  }

  // 3. Page Indexing
  try {
    await page.getByRole('link', { name: /Pages/i }).click();
    report += '## 3. Page Indexing\\n```text\\n';
    report += await scrapeSection('Page-Indexing');
    report += '\\n```\\n\\n';
  } catch(e) {}

  fs.writeFileSync(path.join(artifactsDir, 'GSC_FINAL_STATUS_RAW.txt'), report);
  console.log('GSC scraping complete. Closing browser.');
  await context.close();
}

run().catch(console.error);
