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

add(product({ handle: 'doudoune-brillante-capuche', title: 'Doudoune brillante à capuche', vendor: 'Moncler', price: 169000,
  images: ['jacket-1.jpg', 'jacket-3.jpg'], sizes: ['XS', 'S', 'M', 'L', 'XL'], soldOutSizes: ['XS'], tags: ['nouveau', 'doudoune'] }));
add(product({ handle: 'doudoune-capuche-tartan', title: 'Doudoune matelassée, capuche tartan', vendor: 'Burberry', price: 149000, compare: 199000,
  images: ['jacket-2.jpg'], sizes: ['S', 'M', 'L'], tags: ['doudoune'] }));
add(product({ handle: 'cardigan-maille-doudoune', title: 'Cardigan maille et duvet', vendor: 'Moncler', price: 115000,
  images: ['jacket-3.jpg', 'jacket-1.jpg'], sizes: ['S', 'M', 'L', 'XL'], tags: ['nouveau'] }));
add(product({ handle: 'doudoune-noire-courte', title: 'Doudoune courte noire', vendor: 'Moncler', price: 139000,
  images: ['jacket-1.jpg'], colors: ['Noir', 'Marine', 'Blanc'], sizes: ['S', 'M', 'L'], tags: [] }));

const b30 = [['dior-b30-black', 'Dior B30 Black', 'b30-noir.jpg'], ['dior-b30-beige', 'Dior B30 Beige', 'b30-beige.jpg'],
  ['dior-b30-light', 'Dior B30 Light', 'b30-light.jpg'], ['dior-b30-blue', 'Dior B30 Blue', 'b30-bleu.jpg']];
b30.forEach(([h, t, f]) => add(product({ handle: h, title: t, vendor: 'Dior', price: 110000, images: [f], sizes: ['40', '41', '42', '43', '44', '45'], soldOutSizes: ['45'], tags: ['nouveau'] })));

const mkCollection = (handle, title, list, extra = {}) => ({
  handle, title, url: '/collections/' + handle, products: list, products_count: list.length, all_products_count: list.length,
  description: extra.description || '', image: extra.image || null, sort_by: 'manual', default_sort_by: 'manual',
  sort_options: [{ value: 'manual', name: 'Mise en avant' }, { value: 'price-ascending', name: 'Prix croissant' }, { value: 'price-descending', name: 'Prix décroissant' }, { value: 'created-descending', name: 'Nouveautés' }],
  featured_image: extra.image || (list[0] && list[0].featured_media.preview_image) || null,
  filters: extra.filters || [],
});
const P = (h) => products[h];
const jackets = ['doudoune-brillante-capuche', 'doudoune-capuche-tartan', 'cardigan-maille-doudoune', 'doudoune-noire-courte'].map(P);
const sneakers = b30.map(([h]) => P(h));
const filters = [
  { label: 'Disponibilité', type: 'list', active_values: [], values: [{ label: 'En stock', value: '1', param_name: 'filter.v.availability', count: 4, active: false }, { label: 'Épuisé', value: '0', param_name: 'filter.v.availability', count: 0, active: false }] },
  { label: 'Marque', type: 'list', active_values: [], values: [{ label: 'Moncler', value: 'Moncler', param_name: 'filter.p.vendor', count: 3, active: false }, { label: 'Burberry', value: 'Burberry', param_name: 'filter.p.vendor', count: 1, active: false }] },
  { label: 'Taille', type: 'list', active_values: [], values: ['S', 'M', 'L', 'XL'].map((s) => ({ label: s, value: s, param_name: 'filter.v.option.taille', count: 3, active: false })) },
  { label: 'Prix', type: 'price_range', active_values: [], min_value: { param_name: 'filter.v.price.gte', value: null }, max_value: { param_name: 'filter.v.price.lte', value: null }, range_max: 199000 },
];

const collections = {
  nouveautes: mkCollection('nouveautes', 'Nouveautés', [...jackets.slice(0, 3), ...sneakers]),
  doudounes: mkCollection('doudounes', 'Doudounes', jackets, { description: '<p>Matelassées, brillantes ou techniques : les doudounes de la saison.</p>', image: img('fd-col-doudounes.jpg'), filters }),
  sneakers: mkCollection('sneakers', 'Sneakers', sneakers, { filters }),
  accessoires: mkCollection('accessoires', 'Accessoires', []),
  'best-sellers': mkCollection('best-sellers', 'Best-sellers', [...sneakers.slice(0, 2), ...jackets.slice(0, 2)]),
  'canada-goose': mkCollection('canada-goose', 'Canada Goose', []),
  burberry: mkCollection('burberry', 'Burberry', [P('doudoune-capuche-tartan')]),
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
