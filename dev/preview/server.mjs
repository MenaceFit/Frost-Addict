// Local preview of the theme with demo data (no Shopify connection needed).
// Renders the real Liquid files with liquidjs and a small Shopify-like shim.
// Usage: PREVIEW_IMAGES=/path/to/images node dev/preview/server.mjs  → http://localhost:4100
// It is a development aid only: the real store renders through Shopify.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid, Tag, Hash } from 'liquidjs';
import { demo } from './demo-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const IMAGES = process.env.PREVIEW_IMAGES || path.join(ROOT, 'dev/preview/images');
const PORT = Number(process.env.PORT || 4100);

const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''));
const locale = readJSON(path.join(ROOT, 'locales/fr.default.json'));

/* ---------------- Engine ---------------- */
const engine = new Liquid({
  root: [path.join(ROOT, 'snippets')],
  extname: '.liquid',
  strictVariables: false,
  strictFilters: true,
  jsTruthy: false,
});

const kw = (args) => Object.fromEntries(args.filter(Array.isArray));
const pos = (args) => args.filter((a) => !Array.isArray(a));

/* ---------------- Images ---------------- */
function makeImage(file, alt = '') {
  if (!file) return null;
  if (typeof file === 'object') return file;
  const name = file.replace('shopify://shop_images/', '');
  return { __image: true, src: '/img/' + name, url: '/img/' + name, alt, width: 1600, height: 1200, aspect_ratio: 1.33,
    presentation: { focal_point: '50.0% 50.0%' }, toString() { return this.src; } };
}

/* ---------------- Filters ---------------- */
const money = (cents) => {
  const v = (Number(cents || 0) / 100).toFixed(2).replace('.', ',');
  return v.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' €';
};
const t = (key, ...args) => {
  const vars = kw(args);
  let val = key.split('.').reduce((o, k) => (o ? o[k] : undefined), locale);
  if (val && typeof val === 'object') val = Number(vars.count) === 1 ? val.one : val.other;
  if (val == null) return `translation missing: ${key}`;
  return String(val).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] ?? ''));
};
const filters = {
  t,
  money, money_with_currency: (c) => money(c) + ' EUR', money_without_currency: (c) => (Number(c || 0) / 100).toFixed(2).replace('.', ','),
  asset_url: (f) => '/assets/' + f,
  stylesheet_tag: (u) => `<link rel="stylesheet" href="${u}">`,
  image_url: (img) => (img && (img.src || img.url)) || (typeof img === 'string' ? img : ''),
  image_tag: (url, ...args) => {
    const a = kw(args);
    const attrs = Object.entries(a).filter(([k]) => !['widths', 'width', 'height'].includes(k))
      .map(([k, v]) => `${k}="${String(v ?? '').replace(/"/g, '&quot;')}"`).join(' ');
    return `<img src="${url}" ${attrs}${a.alt === undefined ? ' alt=""' : ''}>`;
  },
  placeholder_svg_tag: (name, cls) => `<svg class="${cls || ''}" viewBox="0 0 525 525" xmlns="http://www.w3.org/2000/svg"><rect width="525" height="525"/><text x="50%" y="50%" text-anchor="middle" font-size="22" fill="#9aa0a6" font-family="sans-serif">${name}</text></svg>`,
  font_face: () => '', font_url: () => '', font_modify: (f, prop, val) => ({ ...f, ...(prop === 'weight' ? { weight: 700 } : { style: val }) }),
  color_mix: () => '#6b6e74',
  link_to: (text, url) => `<a href="${url}">${text}</a>`,
  link_to_vendor: (v) => `<a href="/collections/vendors?q=${encodeURIComponent(v)}">${v}</a>`,
  payment_type_svg_tag: (type) => `<svg viewBox="0 0 38 24" role="img" aria-label="${type}"><rect width="38" height="24" rx="3" fill="#fff"/><text x="19" y="15" font-size="7" text-anchor="middle" fill="#101114" font-family="sans-serif">${type}</text></svg>`,
  payment_button: () => '<div class="shopify-payment-button"><button type="button" class="btn btn--dark btn--block" disabled>Paiement express (Shopify)</button></div>',
  time_tag: (d) => `<time>${new Date(d).toLocaleDateString('fr-FR')}</time>`,
  structured_data: () => '{}',
  default_errors: () => '',
  format_address: () => '',
  json: (v) => JSON.stringify(v ?? null),
  handle: (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
  video_tag: () => '', external_video_tag: () => '', media_tag: () => '', format_code: (c) => c,
};
for (const [n, fn] of Object.entries(filters)) engine.registerFilter(n, fn);

/* ---------------- Tags ---------------- */
// {% schema %} / {% javascript %} / {% stylesheet %}: no output
for (const name of ['schema', 'javascript', 'stylesheet']) {
  engine.registerTag(name, class extends Tag {
    constructor(token, remainTokens, liquid) {
      super(token, remainTokens, liquid);
      while (remainTokens.length) { const tk = remainTokens.shift(); if (tk.name === 'end' + name) return; }
    }
    * render() { return ''; }
  });
}

// {% form 'type', obj, key: value %} ... {% endform %}
engine.registerTag('form', class extends Tag {
  constructor(token, remainTokens, liquid) {
    super(token, remainTokens, liquid);
    this.args = token.args;
    this.tpls = [];
    const stream = liquid.parser.parseStream(remainTokens)
      .on('tag:endform', () => stream.stop())
      .on('template', (tpl) => this.tpls.push(tpl))
      .on('end', () => { throw new Error('form not closed'); });
    stream.start();
  }
  * render(ctx, emitter) {
    const type = (this.args.match(/'([^']+)'/) || [])[1];
    const attrs = {};
    for (const m of this.args.matchAll(/([\w-]+):\s*'([^']*)'/g)) attrs[m[1]] = m[2];
    for (const m of this.args.matchAll(/([\w-]+):\s*([a-z_]\w*)(?=\s*(,|$))/g)) if (!(m[1] in attrs)) attrs[m[1]] = ctx.getSync(m[2].split('.'));
    const action = { product: '/cart/add', customer: '/contact', contact: '/contact', localization: '/localization' }[type] || '/' + type;
    const attrStr = Object.entries(attrs).map(([k, v]) => (v === '' ? k : `${k}="${v}"`)).join(' ');
    emitter.write(`<form method="post" action="${action}" ${attrStr}>`);
    ctx.push({ form: { posted_successfully: false, errors: null } });
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    ctx.pop();
    emitter.write('</form>');
  }
});

// {% paginate x by n %} ... {% endpaginate %}
engine.registerTag('paginate', class extends Tag {
  constructor(token, remainTokens, liquid) {
    super(token, remainTokens, liquid);
    this.tpls = [];
    const stream = liquid.parser.parseStream(remainTokens)
      .on('tag:endpaginate', () => stream.stop())
      .on('template', (tpl) => this.tpls.push(tpl));
    stream.start();
  }
  * render(ctx, emitter) {
    ctx.push({ paginate: { pages: 1, current_page: 1, parts: [] } });
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    ctx.pop();
  }
});

// {% section 'name' %} and {% sections 'group' %}
engine.registerTag('section', class extends Tag {
  constructor(token, remainTokens, liquid) { super(token, remainTokens, liquid); this.name = token.args.replace(/['"\s]/g, ''); }
  * render(ctx, emitter) { emitter.write(yield renderSection(this.name, this.name, {}, ctx.getAll())); }
});
engine.registerTag('sections', class extends Tag {
  constructor(token, remainTokens, liquid) { super(token, remainTokens, liquid); this.name = token.args.replace(/['"\s]/g, ''); }
  * render(ctx, emitter) {
    const group = readJSON(path.join(ROOT, 'sections', this.name + '.json'));
    for (const id of group.order) emitter.write(yield renderSection(id, group.sections[id].type, group.sections[id], ctx.getAll()));
  }
});

/* ---------------- Settings resolution ---------------- */
function schemaOf(type) {
  const src = fs.readFileSync(path.join(ROOT, 'sections', type + '.liquid'), 'utf8');
  const m = src.match(/{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/);
  return m ? JSON.parse(m[1]) : { settings: [] };
}
function resolveValue(def, value) {
  if (value === undefined) value = def.default;
  switch (def.type) {
    case 'collection': return value ? demo.collections[value] || { title: value, handle: value, url: '/collections/' + value, products: [], products_count: 0 } : null;
    case 'product': return value ? demo.products[value] || null : null;
    case 'image_picker': return makeImage(value);
    case 'link_list': return demo.linklists[value] || demo.linklists['main-menu'];
    case 'url': return typeof value === 'string' ? value.replace('shopify://collections/', '/collections/').replace('shopify://products/', '/products/') : value;
    case 'page': return null;
    default: return value;
  }
}
function resolveSettings(defs = [], values = {}) {
  const out = {};
  for (const d of defs) if (d.id) out[d.id] = resolveValue(d, values[d.id]);
  return out;
}
function themeSettings() {
  const schema = readJSON(path.join(ROOT, 'config/settings_schema.json'));
  const data = readJSON(path.join(ROOT, 'config/settings_data.json')).current;
  const defs = schema.flatMap((g) => g.settings || []);
  const s = resolveSettings(defs, data);
  s.type_heading_font = { family: 'Inter', fallback_families: 'sans-serif', weight: 900, style: 'normal' };
  s.type_body_font = { family: 'Inter', fallback_families: 'sans-serif', weight: 400, style: 'normal' };
  return s;
}

let sectionIndex = 0;
async function renderSection(id, type, data, scope) {
  const schema = schemaOf(type);
  const blocks = (data.block_order || Object.keys(data.blocks || {})).map((bid) => {
    const b = data.blocks[bid];
    const bdef = (schema.blocks || []).find((x) => x.type === b.type) || { settings: [] };
    return { id: bid, type: b.type, settings: resolveSettings(bdef.settings, b.settings || {}), shopify_attributes: '' };
  });
  sectionIndex += 1;
  const section = { id, index: sectionIndex, settings: resolveSettings(schema.settings, data.settings || {}), blocks, shopify_attributes: '' };
  const src = fs.readFileSync(path.join(ROOT, 'sections', type + '.liquid'), 'utf8');
  const html = await engine.parseAndRender(src, { ...scope, section }, { globals: globalsOf(scope) });
  return `<div id="shopify-section-${id}" class="shopify-section">${html}</div>`;
}

/* ---------------- Pages ---------------- */
// Shopify exposes these objects everywhere, including inside {% render %}.
const GLOBAL_KEYS = ['settings', 'shop', 'routes', 'linklists', 'collections', 'cart', 'localization', 'request', 'template', 'customer', 'predictive_search'];
function globalsOf(scope) { return Object.fromEntries(GLOBAL_KEYS.filter((k) => k in scope).map((k) => [k, scope[k]])); }

function baseScope(req, extra = {}) {
  return {
    settings: themeSettings(),
    shop: demo.shop, routes: demo.routes, linklists: demo.linklists, collections: Object.values(demo.collections),
    cart: demo.cart(), localization: { available_countries: [] },
    request: { locale: { iso_code: 'fr' }, design_mode: false, page_type: extra.page_type || 'index', origin: 'http://localhost:' + PORT },
    template: { name: extra.page_type || 'index' }, canonical_url: req.url, page_title: extra.page_title || demo.shop.name,
    content_for_header: '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,600;0,700;0,800;0,900;1,700;1,800;1,900&display=swap" rel="stylesheet">',
    ...extra,
  };
}

async function renderTemplate(name, scope) {
  sectionIndex = 0;
  const tpl = readJSON(path.join(ROOT, 'templates', name + '.json'));
  if (process.env.FILL_SPOTLIGHT && name === 'index') {
    const handles = ['dior-b30-black', 'dior-b30-beige', 'dior-b30-light', 'dior-b30-blue'];
    tpl.sections.b30.block_order.forEach((b, i) => { tpl.sections.b30.blocks[b].settings.product = handles[i]; });
  }
  let content = '';
  for (const id of tpl.order) content += await renderSection(id, tpl.sections[id].type, tpl.sections[id], scope);
  const layout = fs.readFileSync(path.join(ROOT, 'layout/theme.liquid'), 'utf8');
  sectionIndex = 100;
  return engine.parseAndRender(layout, { ...scope, content_for_layout: content }, { globals: globalsOf(scope) });
}

async function route(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    if (p.startsWith('/assets/')) return send(res, 200, fs.readFileSync(path.join(ROOT, p)), p.endsWith('.css') ? 'text/css' : 'text/javascript');
    if (p.startsWith('/img/')) {
      const f = path.join(IMAGES, path.basename(p));
      return fs.existsSync(f) ? send(res, 200, fs.readFileSync(f), 'image/jpeg') : send(res, 404, 'no image', 'text/plain');
    }
    if (p === '/cart/add.js' || p === '/cart/change.js') {
      const body = await readBody(req);
      const data = parseBody(body, req.headers['content-type'] || '');
      if (p === '/cart/add.js') {
        const items = data.items || [{ id: Number(data.id), quantity: Number(data.quantity || 1) }];
        items.forEach((it) => demo.addToCart(Number(it.id), Number(it.quantity || 1)));
      } else demo.changeLine(Number(data.line), Number(data.quantity));
      const scope = baseScope(req);
      const sections = {};
      for (const s of String(data.sections || '').split(',').filter(Boolean)) {
        sectionIndex = 50;
        sections[s] = await renderSection(s, s, {}, scope);
      }
      return send(res, 200, JSON.stringify({ items: demo.cart().items, sections }), 'application/json');
    }
    if (p === '/search/suggest') {
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const products = Object.values(demo.products).filter((x) => (x.title + x.vendor).toLowerCase().includes(q));
      const scope = baseScope(req, { predictive_search: { performed: true, terms: q, resources: { products, collections: [], queries: [] } } });
      return send(res, 200, await renderSection('predictive-search', 'predictive-search', {}, scope), 'text/html');
    }
    let html;
    if (p === '/') html = await renderTemplate('index', baseScope(req));
    else if (p.startsWith('/collections/') && p.split('/')[2]) {
      const c = demo.collections[p.split('/')[2]] || demo.collections.doudounes;
      html = await renderTemplate('collection', baseScope(req, { page_type: 'collection', collection: c, page_title: c.title }));
    } else if (p.startsWith('/products/')) {
      const pr = demo.products[p.split('/')[2]] || Object.values(demo.products)[0];
      html = await renderTemplate('product', baseScope(req, { page_type: 'product', product: pr, page_title: pr.title,
        recommendations: { performed: true, products_count: 4, products: Object.values(demo.products).slice(0, 6) } }));
    } else if (p === '/cart') html = await renderTemplate('cart', baseScope(req, { page_type: 'cart' }));
    else if (p === '/search') {
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const results = Object.values(demo.products).filter((x) => (x.title + x.vendor).toLowerCase().includes(q)).map((x) => ({ ...x, object_type: 'product' }));
      html = await renderTemplate('search', baseScope(req, { page_type: 'search', search: { performed: !!q, terms: q, results, results_count: results.length, filters: [] } }));
    } else if (p === '/collections') html = await renderTemplate('list-collections', baseScope(req, { page_type: 'list-collections' }));
    else html = await renderTemplate('404', baseScope(req, { page_type: '404' }));
    return send(res, 200, html, 'text/html; charset=utf-8');
  } catch (e) {
    console.error(e);
    return send(res, 500, `<pre>${String(e.stack || e).replace(/</g, '&lt;')}</pre>`, 'text/html');
  }
}

function send(res, code, body, type) { res.writeHead(code, { 'Content-Type': type }); res.end(body); }
function readBody(req) { return new Promise((r) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => r(b)); }); }
function parseBody(body, type) {
  if (type.includes('json')) return JSON.parse(body || '{}');
  // multipart/form-data (FormData from product form)
  const out = {};
  for (const m of body.matchAll(/name="([^"]+)"\r\n\r\n([^\r]*)/g)) out[m[1]] = m[2];
  return out;
}

http.createServer(route).listen(PORT, () => console.log(`Preview: http://localhost:${PORT}`));
