import { chromium } from 'playwright';
import path from 'path';

const artifactsDir = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\c7bc2848-3ad8-4ae8-9418-9262a7de5b0a';

const scenarios = [
  { name: '1_valid_auction', url: 'http://localhost:3000/auctions/valid', viewport: { width: 1280, height: 800 } },
  { name: '2_missing_story', url: 'http://localhost:3000/auctions/missing-story', viewport: { width: 1280, height: 800 } },
  { name: '3_missing_timeline', url: 'http://localhost:3000/auctions/missing-timeline', viewport: { width: 1280, height: 800 } },
  { name: '4_unknown_module', url: 'http://localhost:3000/auctions/unknown-module', viewport: { width: 1280, height: 800 } },
  { name: '5_unknown_layout', url: 'http://localhost:3000/auctions/unknown-layout', viewport: { width: 1280, height: 800 } },
  { name: '6_merchant_error', url: 'http://localhost:3000/auctions/merchant-error', viewport: { width: 1280, height: 800 } },
  { name: '7_empty_modules', url: 'http://localhost:3000/auctions/empty-modules', viewport: { width: 1280, height: 800 } },
  { name: '8_live_auction_rendering', url: 'http://localhost:3000/auctions/valid', viewport: { width: 1280, height: 800 } },
  { name: '9_mobile_viewport', url: 'http://localhost:3000/auctions/valid', viewport: { width: 375, height: 812 } },
  { name: '10_desktop_viewport', url: 'http://localhost:3000/auctions/valid', viewport: { width: 1920, height: 1080 } },
];

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  
  for (const s of scenarios) {
    console.log(`Capturing ${s.name}...`);
    const page = await browser.newPage({ viewport: s.viewport });
    try {
      await page.goto(s.url, { waitUntil: 'networkidle', timeout: 10000 });
      // Wait for any animations to settle
      await page.waitForTimeout(1000);
      const dest = path.join(artifactsDir, `${s.name}.png`);
      await page.screenshot({ path: dest, fullPage: true });
      console.log(`Saved ${dest}`);
    } catch (e: any) {
      console.error(`Failed to capture ${s.name}: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

captureScreenshots().catch(console.error);
