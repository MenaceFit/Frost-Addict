// Demo data for the local preview only. Nothing here is sent to Shopify.
// Prices and names are placeholders to see the layout at full density.

const img = (file, alt = '') => ({ src: '/img/' + file, url: '/img/' + file, alt, width: 1200, height: 1200, presentation: { focal_point: '50.0% 50.0%' } });

let nextVariantId = 1000;
function product({ handle, title, vendor, price, compare = 0, images, sizes = null, colors = null, tags = [], soldOutSizes = [], description = '' }) {
  const media = images.map((f, i) => ({ id: handle.length * 100 + i, media_type: 'image', alt: title, preview_image: img(f, title), ...img(f, title) }));
  const options = [];
  if (colors) options.push({ name: 'Couleur', values: colors });
  if (sizes) options.push({ name: 'Taille', values: sizes });
  const combos = options.length === 0 ? [[]] : options.reduce((acc, o) => acc.flatMap((c) => o.values.map((v) => [...c, v])), [[]]);
  const variants = combos.map((opts) => {
    const available = !opts.some((o) => soldOutSizes.includes(o));
    return {
      id: nextVariantId++, title: opts.join(' / ') || 'Default Title', options: opts, option1: opts[0], available,
      price, compare_at_price: compare || null, featured_media: null, inventory_management: 'shopify', inventory_quantity: available ? 2 : 0,
    };
  });
  const first = variants.find((v) => v.available) || variants[0];
  return {
    id: nextVariantId++, handle, title, vendor, url: '/products/' + handle, price, compare_at_price: compare || null, price_varies: false,
    available: variants.some((v) => v.available), tags, description: description || `<p>${title} — description de démonstration.</p>`,
    featured_media: media[0], media, options: options.map((o) => o.name),
    options_with_values: options.map((o, i) => ({ name: o.name, values: o.values, selected_value: first.options[i] })),
    has_only_default_variant: options.length === 0, variants, selected_or_first_available_variant: first, metafields: {},
  };
}

const products = {};
const add = (p) => { products[p.handle] = p; return p; };

// The 24 catalogue products created in Shopify (as drafts). Prices are not set yet: price 0.
const J = ['S', 'M', 'L', 'XL', 'XXL']; const SZ = ['39', '40', '41', '42', '43', '44', '45'];
const CAT = [
  ['dior-sneakers-b22-gris', 'Sneakers B22 gris', 'Dior', 'dior-b22', 1, ['sneakers', 'nouveau', 'best-seller']],
  ['chanel-baskets-cc-argent-et-blanc', 'Baskets CC argent et blanc', 'Chanel', 'chanel-cc', 1, ['sneakers', 'nouveau']],
  ['nike-air-max-95-degrade-gris', 'Air Max 95 dégradé gris', 'Nike', 'nike-airmax95', 1, ['sneakers', 'nouveau', 'best-seller']],
  ['nike-sneakers-nocta-orange', 'Sneakers NOCTA orange', 'Nike', 'nike-nocta', 1, ['sneakers', 'nouveau']],
  ['lanvin-sneakers-curb-bleu', 'Sneakers Curb bleu', 'Lanvin', 'lanvin-curb', 1, ['sneakers', 'nouveau']],
  ['ugg-sneakers-a-lacets-camel', 'Sneakers à lacets camel', 'UGG', 'ugg-lace', 1, ['sneakers', 'nouveau']],
  ['canada-goose-parka-a-capuche-noire', 'Parka à capuche noire', 'Canada Goose', 'canada-goose-parka', 0, ['doudoune', 'best-seller']],
  ['moncler-doudoune-laquee-noire-a-capuche', 'Doudoune laquée noire à capuche', 'Moncler', 'moncler-shiny', 0, ['doudoune', 'best-seller']],
  ['moncler-doudoune-sans-manches-laquee-noire', 'Doudoune sans manches laquée noire', 'Moncler', 'moncler-vest', 0, ['doudoune']],
  ['burberry-doudoune-a-capuche-check', 'Doudoune à capuche check', 'Burberry', 'burberry-puffer', 0, ['doudoune']],
  ['canada-goose-doudoune-sans-manches-noire', 'Doudoune sans manches noire', 'Canada Goose', 'cg-vest', 0, ['doudoune']],
  ['c-p-company-doudoune-a-capuche-goggle-noire', 'Doudoune à capuche Goggle noire', 'C.P. Company', 'cp-puffer', 0, ['doudoune']],
  ['parajumpers-doudoune-a-capuche-bleu-marine', 'Doudoune à capuche bleu marine', 'Parajumpers', 'parajumpers-puffer', 0, ['doudoune']],
  ['ralph-lauren-doudoune-a-capuche-noire', 'Doudoune à capuche noire', 'Ralph Lauren', 'rl-hooded-puffer', 0, ['doudoune']],
  ['ralph-lauren-doudoune-legere-bleu-marine', 'Doudoune légère bleu marine', 'Ralph Lauren', 'rl-puffer', 0, ['doudoune']],
  ['ralph-lauren-doudoune-sans-manches-noire', 'Doudoune sans manches noire', 'Ralph Lauren', 'rl-vest', 0, ['doudoune']],
  ['nike-gilet-matelasse-running-noir', 'Gilet matelassé running noir', 'Nike', 'nike-vest', 0, ['doudoune']],
  ['moncler-cardigan-matelasse-noir', 'Cardigan matelassé noir', 'Moncler', 'moncler-knit', 0, ['veste']],
  ['c-p-company-veste-hybride-goggle-noire', 'Veste hybride Goggle noire', 'C.P. Company', 'cp-hybrid', 0, ['veste']],
  ['parajumpers-veste-hybride-matelassee-noire', 'Veste hybride matelassée noire', 'Parajumpers', 'parajumpers-hybrid', 0, ['veste']],
  ['arcteryx-veste-technique-a-capuche-noire', "Veste technique à capuche noire", "Arc'teryx", 'arcteryx-jacket', 0, ['veste']],
  ['c-p-company-veste-shell-a-capuche-goggle-noire', 'Veste Shell à capuche Goggle noire', 'C.P. Company', 'cp-shell', 0, ['veste']],
  ['nike-veste-coupe-vent-noire', 'Veste coupe-vent noire', 'Nike', 'nike-jacket', 0, ['veste']],
  ['nike-veste-zippee-a-capuche-noire', 'Veste zippée à capuche noire', 'Nike', 'nike-hoodie', 0, ['veste']],
];
CAT.forEach(([handle, t, vendor, key, snk, tags]) => add(product({ handle, title: `${vendor} — ${t}`, vendor, price: 0,
  images: [`fd-${key}-1-podium.jpg`, `fd-${key}-2-studio.jpg`, ...(snk ? [`fd-${key}-3-photo.jpg`] : [])], sizes: snk ? SZ : J, tags })));
const b30 = CAT.filter((c) => c[4]).map((c) => [c[0]]);
const sansManches = CAT.filter((c) => /sans-manches|gilet/.test(c[0])).map((c) => products[c[0]]);
const mkCollection = (handle, title, list, extra = {}) => ({
  handle, title, url: '/collections/' + handle, products: list, products_count: list.length, all_products_count: list.length,
  description: extra.description || '', image: extra.image || null, sort_by: 'manual', default_sort_by: 'manual',
  sort_options: [{ value: 'manual', name: 'Mise en avant' }, { value: 'price-ascending', name: 'Prix croissant' }, { value: 'price-descending', name: 'Prix décroissant' }, { value: 'created-descending', name: 'Nouveautés' }],
  featured_image: extra.image || (list[0] && list[0].featured_media.preview_image) || null,
  filters: extra.filters || [],
});
const P = (h) => products[h];
const jackets = CAT.filter((c) => c[5].includes('doudoune')).map((c) => P(c[0]));
const vestes = CAT.filter((c) => c[5].includes('veste')).map((c) => P(c[0]));
const sneakers = b30.map(([h]) => P(h));
const filters = [
  { label: 'Disponibilité', type: 'list', active_values: [], values: [{ label: 'En stock', value: '1', param_name: 'filter.v.availability', count: 4, active: false }, { label: 'Épuisé', value: '0', param_name: 'filter.v.availability', count: 0, active: false }] },
  { label: 'Marque', type: 'list', active_values: [], values: [{ label: 'Moncler', value: 'Moncler', param_name: 'filter.p.vendor', count: 3, active: false }, { label: 'Burberry', value: 'Burberry', param_name: 'filter.p.vendor', count: 1, active: false }] },
  { label: 'Taille', type: 'list', active_values: [], values: ['S', 'M', 'L', 'XL'].map((s) => ({ label: s, value: s, param_name: 'filter.v.option.taille', count: 3, active: false })) },
  { label: 'Prix', type: 'price_range', active_values: [], min_value: { param_name: 'filter.v.price.gte', value: null }, max_value: { param_name: 'filter.v.price.lte', value: null }, range_max: 199000 },
];

const collections = {
  nouveautes: mkCollection('nouveautes', 'Nouveautés', [...sneakers, ...jackets.slice(0, 4)]),
  vestes: mkCollection('vestes', 'Vestes', vestes, { filters }),
  'doudounes-sans-manches': mkCollection('doudounes-sans-manches', 'Doudounes sans manches', sansManches),
  doudounes: mkCollection('doudounes', 'Doudounes', jackets, { description: '<p>Matelassées, brillantes ou techniques : les doudounes de la saison.</p>', image: img('fd-col-doudounes.jpg'), filters }),
  sneakers: mkCollection('sneakers', 'Sneakers', sneakers, { filters }),
  accessoires: mkCollection('accessoires', 'Accessoires', []),
  'best-sellers': mkCollection('best-sellers', 'Best-sellers', CAT.filter((c) => c[5].includes('best-seller')).map((c) => P(c[0]))),
  'canada-goose': mkCollection('canada-goose', 'Canada Goose', CAT.filter((c) => c[2] === 'Canada Goose').map((c) => P(c[0]))),
  burberry: mkCollection('burberry', 'Burberry', [P('burberry-doudoune-a-capuche-check')]),
  'stone-island': mkCollection('stone-island', 'Stone Island', []),
};

const link = (title, url, links = []) => ({ title, url, links, active: false, child_active: false });
const linklists = {
  'frost-winter-menu': { title: 'Menu', links: [
    link('Accueil', '/'), link('Boutique', '/collections/all', [link('Nouveautés', '/collections/nouveautes'), link('Doudounes', '/collections/doudounes'), link('Sneakers', '/collections/sneakers'), link('Accessoires', '/collections/accessoires')]),
    link('Sneakers', '/collections/sneakers'), link('Doudounes', '/collections/doudounes'), link('Accessoires', '/collections/accessoires'),
    link('Marques', '/collections'), link('Nouveautés', '/collections/nouveautes'), link('Best-sellers', '/collections/best-sellers'),
  ] },
  'frost-aide': { title: 'Aide', links: [link('Contact', '/pages/contact'), link('Recherche', '/search'), link('Toutes les collections', '/collections')] },
  'main-menu': { title: 'Main', links: [link('Accueil', '/')] },
  footer: { title: 'Footer', links: [link('Recherche', '/search')] },
};

const cartLines = [];
function cart() {
  const items = cartLines.map((l, i) => {
    const pr = Object.values(products).find((p) => p.variants.some((v) => v.id === l.id));
    const v = pr.variants.find((x) => x.id === l.id);
    return { key: String(l.id), product_id: pr.id, url: pr.url, image: pr.featured_media.preview_image, product: pr, vendor: pr.vendor, variant: v, quantity: l.qty,
      original_line_price: v.price * l.qty, final_line_price: v.price * l.qty, properties: [], line_level_discount_allocations: [], url_to_remove: '/cart/change?line=' + (i + 1) + '&quantity=0' };
  });
  return { items, item_count: items.reduce((n, i) => n + i.quantity, 0), total_price: items.reduce((n, i) => n + i.final_line_price, 0),
    cart_level_discount_applications: [], taxes_included: true, currency: { iso_code: 'EUR' }, note: '' };
}

export const demo = {
  products, collections, linklists, cart,
  addToCart(id, qty) { const l = cartLines.find((x) => x.id === id); if (l) l.qty += qty; else cartLines.push({ id, qty }); },
  changeLine(line, qty) { const l = cartLines[line - 1]; if (!l) return; if (qty <= 0) cartLines.splice(line - 1, 1); else l.qty = qty; },
  shop: { name: 'Frost District', currency: 'EUR', description: 'Doudounes, sneakers et accessoires pour l\'hiver.', customer_accounts_enabled: true, policies: [
    { title: 'Politique de remboursement', url: '/policies/refund-policy' }, { title: 'Confidentialité', url: '/policies/privacy-policy' }, { title: 'CGV', url: '/policies/terms-of-service' }],
    enabled_payment_types: ['visa', 'master', 'american_express', 'apple_pay', 'paypal'], shipping_policy: { body: '', url: '' } },
  routes: { root_url: '/', cart_url: '/cart', cart_add_url: '/cart/add', cart_change_url: '/cart/change', search_url: '/search', predictive_search_url: '/search/suggest',
    all_products_collection_url: '/collections/all', collections_url: '/collections', account_url: '/account', account_login_url: '/account/login',
    product_recommendations_url: '/recommendations/products' },
};
