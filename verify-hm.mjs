import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const STORE   = 'https://5ci887-xv.myshopify.com';
const PREVIEW = '?preview_theme_id=152614928558';
const BASE    = STORE + PREVIEW;
const SCRAP   = 'C:/Users/dell/AppData/Local/Temp/claude/c--Users-dell-Desktop-legxi/6bc3be1c-5f7f-45ef-8454-096c720e8a4f/scratchpad';

const ARGENTINA_VID = 47960047780014;
const FRANCE_VID    = 47975762460846;

const SS = (page, name) => page.screenshot({ path: `${SCRAP}/${name}.png`, fullPage: false }).catch(() => {});

async function clearCart(page) {
  await page.goto(STORE + '/cart/clear' + PREVIEW, { waitUntil: 'domcontentloaded' });
}

async function apiAdd(page, vid, qty = 1) {
  return page.request.post(STORE + '/cart/add.js', {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ items: [{ id: vid, quantity: qty }] })
  });
}

async function openCart(page) {
  await page.goto(BASE, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(2000);
  await page.locator('[aria-controls="cart-drawer"]').first().click();
  await page.waitForTimeout(1500);
}

async function getSuggest(page) {
  return page.evaluate(() => {
    const root = document.getElementById('lgx-hm-suggest-root');
    const row  = document.getElementById('lgx-hm-suggest-row');
    if (!root) return { exists: false };
    const display = window.getComputedStyle(root).display;
    return {
      exists: true,
      hidden: display === 'none',
      cards:  row ? row.querySelectorAll('.lgx-hm-scard').length : 0,
      titles: row ? Array.from(row.querySelectorAll('.lgx-hm-scard__name')).map(e => e.textContent.trim()) : [],
      ready:  root.getAttribute('data-lgx-ready')
    };
  });
}

async function getPromo(page) {
  return page.evaluate(() => {
    const p = document.querySelector('.lgx-hm-promo');
    if (!p) return { exists: false };
    return {
      exists: true,
      msg:    p.querySelector('.lgx-hm-promo__msg')?.textContent?.trim(),
      footer: p.querySelector('.lgx-hm-promo__footer span')?.textContent?.trim(),
      done:   p.classList.contains('lgx-hm-promo--done')
    };
  });
}

async function waitReady(page, ms = 5000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const s = await getSuggest(page);
    if (s.exists && s.ready) return s;
    await page.waitForTimeout(400);
  }
  return getSuggest(page);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const log  = [];
  const note = (n, msg) => { log.push(`[${n}] ${msg}`); console.log(`[${n}] ${msg}`); };
  const obs  = (l, v)   => { log.push(`  ${l}: ${JSON.stringify(v)}`); console.log(`  ${l}: ${JSON.stringify(v)}`); };

  const results = {};

  try {
    note('SETUP', 'Clearing cart');
    await clearCart(page);

    // ── STEP 1: 1 HM → suggestions should appear ──────────────────
    note('STEP 1', 'Add 1 Argentina HM, open cart drawer');
    await apiAdd(page, ARGENTINA_VID);
    await openCart(page);
    const s1 = await waitReady(page, 6000);
    const p1 = await getPromo(page);
    obs('suggestions', s1);
    obs('promo', p1);
    await SS(page, '01-one-hm');
    results.step1_visible   = !s1.hidden && s1.cards > 0;
    results.step1_cards     = s1.cards;
    results.step1_titles    = s1.titles;
    results.step1_promo_msg = p1.msg;

    if (s1.hidden || s1.cards === 0) {
      note('ABORT', 'Suggestions not visible at step 1 — cannot continue');
    } else {
      // ── STEP 2: Add 2nd HM via suggestion button ─────────────────
      note('STEP 2', 'Click Add button on first suggestion card → 2nd HM');
      await page.locator('.lgx-hm-scard__add').first().click();
      await page.waitForTimeout(3500);
      const s2 = await waitReady(page, 5000);
      const p2 = await getPromo(page);
      obs('suggestions after 2nd add', s2);
      obs('promo after 2nd add', p2);
      await SS(page, '02-two-hm');
      results.step2_cards_decreased = s2.cards < s1.cards;
      results.step2_cards           = s2.cards;
      results.step2_titles          = s2.titles;
      results.step2_promo_footer    = p2.footer;

      // ── STEP 3: Add 3rd HM, trigger cart:change, suggestions hide ─
      note('STEP 3', 'Add 3rd HM (France) via API and fire cart:change');
      await apiAdd(page, FRANCE_VID);
      await page.evaluate(() => {
        fetch('/cart.js').then(r => r.json()).then(cart => {
          document.documentElement.dispatchEvent(new CustomEvent('cart:change', { bubbles: true, detail: { cart } }));
        });
      });
      await page.waitForTimeout(3000);
      const s3 = await getSuggest(page);
      const p3 = await getPromo(page);
      obs('suggestions at 3 HMs (expect hidden)', s3);
      obs('promo at 3 HMs (expect done=true)', p3);
      await SS(page, '03-three-hm');
      results.step3_hidden_at_3 = s3.hidden;
      results.step3_promo_done  = p3.done;

      // ── STEP 4: Decrease qty → suggestions reappear ───────────────
      note('STEP 4', 'Click minus button on first cart line item → back to 2 HMs');
      // Find quantity minus button - check multiple selector patterns
      const minusSel = 'quantity-selector button[aria-label*="Decrease" i], button[aria-label*="decrease" i], .quantity__button--minus, [data-action="decrease"]';
      const minusCount = await page.locator(minusSel).count();
      obs('minus buttons found', minusCount);
      await SS(page, '04a-before-decrease');

      if (minusCount > 0) {
        await page.locator(minusSel).first().click();
        await page.waitForTimeout(4000); // AJAX update + MutationObserver
        const s4 = await waitReady(page, 6000);
        const p4 = await getPromo(page);
        obs('suggestions after decrease (expect visible)', s4);
        obs('promo after decrease', p4);
        await SS(page, '04b-after-decrease');
        results.step4_reappeared = !s4.hidden && s4.cards > 0;
        results.step4_cards      = s4.cards;
        results.step4_titles     = s4.titles;

        // ── PROBE: Verify no overlap between suggestions and cart ────
        note('PROBE', 'Verify suggestion cards exclude items already in cart');
        const cartItems = await page.evaluate(async () => {
          const r = await fetch('/cart.js'); const c = await r.json();
          return c.items.map(i => i.title);
        });
        obs('cart titles', cartItems);
        obs('suggestion titles', s4.titles);
        results.probe_cart_titles = cartItems;
        results.probe_suggest_titles = s4.titles;
      } else {
        note('STEP 4 SKIP', 'Minus button not found in cart drawer');
        results.step4_reappeared = 'SKIP - no minus button found';
        // Dump cart HTML for debugging
        const cartHtml = await page.evaluate(() => {
          const d = document.querySelector('.cart-drawer__item-list, .drawer__scrollable, [id*="cart"]');
          return d ? d.innerHTML.substring(0, 2000) : 'not found';
        });
        obs('cart HTML snippet', cartHtml.substring(0, 500));
      }
    }

  } catch (e) {
    note('ERROR', e.message);
    await SS(page, 'error');
    results.error = e.message;
  } finally {
    console.log('\n=== FINAL RESULTS ===\n' + JSON.stringify(results, null, 2));
    writeFileSync(`${SCRAP}/verify-results.json`, JSON.stringify({ results, log }, null, 2));
    await browser.close();
  }
})();
