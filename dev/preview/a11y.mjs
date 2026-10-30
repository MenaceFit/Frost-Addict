// WCAG 2.1 AA scan with axe-core + touch-target and keyboard checks on the local preview.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const axe = fs.readFileSync(new URL('../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const base = 'http://localhost:' + (process.env.PORT || 4101);
const pages = ['/', '/collections/doudounes', '/products/dior-sneakers-b22-gris', '/cart'];
const browser = await chromium.launch();
for (const [label, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: vp });
  await page.addInitScript(() => { try { localStorage.setItem('frost-popup-until', String(Date.now() + 9e9)); } catch (e) {} });
  for (const p of pages) {
    await page.goto(base + p, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelectorAll('[data-reveal],[data-split]').forEach((e) => e.classList.add('is-revealed')));
    await page.waitForTimeout(400);
    await page.addScriptTag({ content: axe });
    const res = await page.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
      return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, n: v.nodes.length, sample: v.nodes.slice(0, 3).map((x) => x.target.join(' ') + ' :: ' + (x.failureSummary || '').split('\n')[1]) }));
    });
    const small = label === 'mobile' ? await page.evaluate(() => [...document.querySelectorAll('a, button, input, select, [role=tab]')]
      .filter((e) => e.offsetParent && !e.closest('[hidden],[aria-hidden=true]'))
      .map((e) => { const r = e.getBoundingClientRect(); return { t: (e.getAttribute('aria-label') || e.textContent || e.name || e.tagName).trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height), cls: e.className.toString().slice(0, 30) }; })
      .filter((x) => x.w > 0 && (x.w < 24 || x.h < 24))) : [];
    console.log(`\n## ${label} ${p}: ${res.length} axe violations`);
    res.forEach((v) => console.log(`- [${v.impact}] ${v.id} (${v.n}) ${v.help}\n    ${v.sample.join('\n    ')}`));
    if (small.length) console.log(`  targets < 24px: ${JSON.stringify(small.slice(0, 12))}`);
  }
  await page.close();
}
await browser.close();
