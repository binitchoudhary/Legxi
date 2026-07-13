import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://legxi.co/products/argentine-icons-24k-signature-series');
  await page.waitForLoadState('networkidle');

  // Inject trace via page.evaluate
  await page.evaluate(() => {
    window.qtyTraceLogs = [];
    const grid = document.getElementById('lgx-player-grid');
    const cards = Array.from(grid.querySelectorAll('.lgx-card'));
    
    cards.forEach(card => {
      const qtyEl = card.querySelector('.lgx-qty-val');
      const origText = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
      const name = card.dataset.name;
      
      Object.defineProperty(qtyEl, 'textContent', {
        set: function(val) {
          const err = new Error();
          window.qtyTraceLogs.push(`QTY SET on ${name} to: ${val}\n${err.stack}`);
          return origText.set.call(this, val);
        },
        get: function() {
          return origText.get.call(this);
        }
      });
    });
  });

  console.log('Tracing installed. Clicking Enzo Fernandes name...');
  
  // Click the card name
  const cards = await page.$$('.lgx-card');
  const enzoCard = cards[2];
  const nameEl = await enzoCard.$('.lgx-card-name');
  await nameEl.click();
  
  await page.waitForTimeout(2000);
  
  // Read logs
  const logs = await page.evaluate(() => window.qtyTraceLogs);
  console.log('Logs captured:');
  console.log(logs.join('\n\n'));
  
  await browser.close();
})();
