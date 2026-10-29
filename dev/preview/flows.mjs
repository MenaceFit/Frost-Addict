// Interactive checks of the main shopping paths against the local preview.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const base = 'http://localhost:' + (process.env.PORT || 4100);
const out = 'dev/screens';
const browser = await chromium.launch();
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  (' + extra + ')' : ''}`);

// Desktop
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + '/', { waitUntil: 'networkidle' });

  const count = async () => Number((await page.locator('[data-cart-count]').first().textContent()).trim() || 0);
  const start = await count();
  // Quick add with size panel
  const card = page.locator('#shopify-section-new .card').first();
  await card.locator('[data-quick-toggle]').click();
  check('quick add: size panel opens', await card.locator('[data-quick-panel]').isVisible());
  await card.locator('.size-chip:not([disabled])').first().click();
  await page.waitForSelector('[data-cart-drawer].is-open', { timeout: 3000 }).catch(() => {});
  check('quick add: cart drawer opens', await page.locator('[data-cart-drawer].is-open').count() === 1);
  check('cart count updated', (await count()) === start + 1, `${start} -> ${await count()}`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/flow-drawer-desktop.png` });
  // Increase quantity in drawer
  const before = await count();
  await page.locator('[data-cart-drawer] .cart-item').first().locator('button[data-qty-change]').nth(1).click();
  await page.waitForTimeout(600);
  check('drawer: quantity +1', (await count()) === before + 1, `${before} -> ${await count()}`);
  await page.keyboard.press('Escape');
  check('drawer: Escape closes', await page.locator('[data-cart-drawer].is-open').count() === 0);

  // Tabs
  await page.locator('#shopify-section-bestsellers [role="tab"]').nth(2).click();
  const sel = await page.locator('#shopify-section-bestsellers [role="tab"][aria-selected="true"]').textContent();
  check('tabs switch', sel.includes('Burberry'));

  // Carousel next
  const track = page.locator('#shopify-section-new [data-carousel-track]');
  const scrollBefore = await track.evaluate((t) => t.scrollLeft);
  await page.locator('#shopify-section-new [data-carousel-next]').click();
  await page.waitForTimeout(700);
  check('carousel scrolls', (await track.evaluate((t) => t.scrollLeft)) > scrollBefore);

  // Hero slide
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(300, 300); await page.mouse.move(1200, 600, { steps: 8 });
  await page.waitForTimeout(500);
  const tf = await page.locator('.hero3d [data-depth]').nth(1).evaluate((e) => e.style.transform);
  check('hero 3D depth follows pointer', /translate3d\(-?[1-9]/.test(tf), tf);

  // Search
  await page.locator('.header__actions [data-search-open]').click();
  await page.locator('[data-predictive-input]').fill('dior');
  await page.waitForTimeout(800);
  check('predictive search results', (await page.locator('[data-predictive-results] .predictive__item').count()) > 0);
  await page.screenshot({ path: `${out}/flow-search-desktop.png` });
  await page.keyboard.press('Escape');

  // Product page: choose size + add
  await page.goto(base + '/products/doudoune-brillante-capuche', { waitUntil: 'networkidle' });
  await page.locator('fieldset.option input[value="M"]').check();
  check('variant: URL updated', page.url().includes('variant='));
  await page.locator('[data-add-button]').click();
  await page.waitForSelector('[data-cart-drawer].is-open', { timeout: 3000 }).catch(() => {});
  check('product: add to cart opens drawer', await page.locator('[data-cart-drawer].is-open').count() === 1);
  // v2 conversion features
  check('free shipping bar in drawer', await page.locator('[data-cart-drawer] [data-ship-bar]').count() === 1);
  await page.waitForTimeout(800);
  check('cart upsell loaded', (await page.locator('[data-cart-upsell] .upsell__item').count()) > 0);
  await page.keyboard.press('Escape');
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.mouse.move(700, 300); await page.mouse.move(700, -5);
  await page.evaluate(() => document.dispatchEvent(new MouseEvent('mouseout', { clientY: -1, relatedTarget: null, bubbles: true })));
  await page.waitForTimeout(400);
  check('popup opens on exit intent', await page.locator('[data-popup]').isVisible());
  await page.screenshot({ path: `${out}/flow-popup-desktop.png` });
  await page.keyboard.press('Escape');
  check('popup closes', !(await page.locator('[data-popup]').isVisible()));
  check('split titles applied', (await page.locator('[data-split] .w').count()) > 10);
  check('no JS errors (desktop)', errors.length === 0, errors.join(' | '));
  await page.close();
}

// Mobile
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.locator('[data-menu-open]').click();
  await page.waitForTimeout(400);
  check('mobile menu opens', await page.locator('[data-menu-drawer].is-open').count() === 1);
  await page.screenshot({ path: `${out}/flow-menu-mobile.png` });
  await page.locator('[data-menu-drawer] button[data-drawer-close]').first().click();
  await page.waitForTimeout(400);
  check('mobile menu closes', await page.locator('[data-menu-drawer].is-open').count() === 0);
  await page.goto(base + '/collections/doudounes', { waitUntil: 'networkidle' });
  await page.locator('[data-filters-open]').click();
  await page.waitForTimeout(400);
  check('mobile filters drawer opens', await page.locator('[data-filters-drawer].is-open').count() === 1);
  await page.screenshot({ path: `${out}/flow-filters-mobile.png` });
  await page.goto(base + '/cart', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${out}/flow-cart-mobile.png`, fullPage: true });
  check('cart page lists items', (await page.locator('.cart-item').count()) > 0);
  check('no JS errors (mobile)', errors.length === 0, errors.join(' | '));
  await page.close();
}
await browser.close();
console.log(results.join('\n'));
