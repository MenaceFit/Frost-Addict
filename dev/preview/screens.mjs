// Screenshots of the local preview at 3 widths + basic checks (console errors, horizontal overflow).
// Usage: node dev/preview/screens.mjs [path ...]   (server must be running on PORT, default 4100)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright')); }
import fs from 'node:fs';
const base = 'http://localhost:' + (process.env.PORT || 4100);
const out = process.env.OUT || 'dev/screens';
fs.mkdirSync(out, { recursive: true });
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['/', '/collections/doudounes', '/products/doudoune-brillante-capuche', '/cart'];
const sizes = [['desktop', 1440, 900], ['tablet', 768, 1024], ['mobile', 390, 844]];
const browser = await chromium.launch();
for (const [label, width, height] of sizes) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  for (const p of pages) {
    await page.goto(base + p, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const name = (p === '/' ? 'home' : p.replace(/\//g, '_').replace(/^_/, '')) + '-' + label;
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
    console.log(`${name}: overflow=${overflow}px errors=${errors.length ? errors.join(' | ') : 0}`);
    errors.length = 0;
  }
  await ctx.close();
}
await browser.close();
