// Renders the three.js scenes in scenes.js to PNG files with headless Chromium.
// Usage: node dev/renders/render.mjs [sceneName ...]   → dev/renders/out/<name>.png (+ meta.json)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const DIR = path.dirname(fileURLToPath(import.meta.url));
const THREE_DIR = path.join(DIR, '../node_modules/three');
const OUT = path.join(DIR, 'out');
fs.mkdirSync(OUT, { recursive: true });

const SIZES = {
  'hero-bg': [2400, 1200], 'hero-ice': [2400, 1200],
  'cat-sneakers': [1000, 1250], 'cat-doudounes': [1000, 1250], 'cat-accessoires': [1000, 1250], 'cat-marques': [1000, 1250],
  'prop-sneakers': [1000, 1250], 'prop-doudounes': [1000, 1250], 'prop-accessoires': [1000, 1250], 'prop-marques': [1000, 1250],
  'hero-flake': [2400, 1200], 'frost-type': [2400, 1000],
};
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SIZES);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const meta = fs.existsSync(path.join(OUT, 'meta.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'meta.json'))) : {};
for (const name of wanted) {
  const SS = Number(process.env.SUPERSAMPLE || 2);
  const [w, h] = SIZES[name].map((v) => v * SS);
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  page.on('pageerror', (e) => console.error(name, e.message));
  await page.route('http://render.local/**', (route) => {
    const u = new URL(route.request().url());
    let file;
    if (u.pathname.startsWith('/three/')) file = path.join(THREE_DIR, u.pathname.slice('/three/'.length));
    else if (u.pathname === '/scenes.js') file = path.join(DIR, 'scenes.js');
    else return route.fulfill({ status: 200, contentType: 'text/html', body: `<!doctype html><html><head><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script></head><body style="margin:0;background:transparent"></body></html>` });
    const type = file.endsWith('.json') ? 'application/json' : 'text/javascript';
    return route.fulfill({ status: 200, contentType: type, body: fs.readFileSync(file) });
  });
  await page.goto('http://render.local/');
  const t0 = Date.now();
  const result = await page.evaluate(async ({ name, w, h }) => {
    const { scenes } = await import('/scenes.js');
    const { canvas, meta } = await scenes[name]({ w, h });
    return { data: canvas.toDataURL('image/png'), meta };
  }, { name, w, h });
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(result.data.split(',')[1], 'base64'));
  if (result.meta) meta[name] = result.meta;
  console.log(`${name}: ${w}x${h} in ${((Date.now() - t0) / 1000).toFixed(1)}s`, result.meta ? JSON.stringify(result.meta) : '');
  await page.close();
}
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2));
await browser.close();
