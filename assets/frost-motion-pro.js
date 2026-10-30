/* FROST DISTRICT — motion.dev layer.
   Progressive enhancement on top of frost-motion.js: runs only when Motion loaded and the
   visitor allows motion. Springs for reveals, hero entrance, scroll-linked hero exit,
   press feedback and cart micro-interactions. Everything stays usable without it. */
(() => {
  const M = window.Motion;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!M || reduce || !document.body.classList.contains('has-motion')) return;
  const { animate, inView, scroll, stagger, press, hover } = M;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const springIn = { type: 'spring', stiffness: 220, damping: 28, mass: 0.9 };
  const springPop = { type: 'spring', stiffness: 520, damping: 18 };

  try {
    document.documentElement.classList.add('has-motion-lib');

    /* Reveals: Motion springs replace the CSS fade for [data-reveal] */
    const reveal = (root = document) => {
      $$('[data-reveal]:not([data-m-done])', root).forEach((el) => {
        el.dataset.mDone = '1';
        inView(el, () => {
          const d = parseFloat(getComputedStyle(el).getPropertyValue('--delay')) || 0;
          animate(el, { opacity: [0, 1], y: [28, 0] }, { ...springIn, delay: d });
        }, { margin: '0px 0px -8% 0px' });
      });
    };
    reveal();
    document.addEventListener('shopify:section:load', (e) => reveal(e.target));
    document.addEventListener('frost:cart:rendered', () => reveal($('[data-cart-drawer]') || document));

    /* Hero: staggered entrance + scroll-linked exit */
    const hero = $('[data-hero3d]');
    if (hero) {
      const items = $$('[data-m-hero]', hero);
      if (items.length) animate(items, { opacity: [0, 1], y: [24, 0] }, { ...springIn, delay: stagger(0.09, { startDelay: 0.35 }) });
      const cut = $('.hero3d__cutout img', hero);
      if (cut) animate(cut, { opacity: [0, 1], y: [-60, 0], rotate: [-4, 0] }, { type: 'spring', stiffness: 160, damping: 14, delay: 0.25 });
      const content = $('.hero3d__content', hero);
      if (content) scroll(animate(content, { opacity: [1, 0.15], y: [0, -70] }, { ease: 'linear' }), { target: hero, offset: ['start start', 'end start'] });
    }

    /* Press feedback on buttons (not magnetic ones: they own their transform) */
    press('button.btn:not([data-magnetic]), a.btn:not([data-magnetic]), button.round-arrow, a.round-arrow, button.icon-btn, a.icon-btn, button.tabs__tab, button[data-quick-add]', (el) => {
      animate(el, { scale: 0.94 }, { duration: 0.12 });
      return () => animate(el, { scale: 1 }, springPop);
    });

    /* Hover lift on product card media (fine pointers only) */
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      hover('.card', (card) => {
        const btn = $('[data-quick-add], .card__quick', card);
        if (btn) animate(btn, { y: [8, 0], opacity: [0.6, 1] }, springIn);
      });
    }

    /* Cart: bounce the icon and pop the count when something is added */
    document.addEventListener('frost:cart:added', () => {
      $$('[data-cart-open] > .icon').forEach((i) => animate(i, { rotate: [0, -14, 10, 0], scale: [1, 1.22, 1] }, { duration: 0.6, ease: 'easeOut' }));
      $$('[data-cart-count]').forEach((c) => animate(c, { scale: [0.4, 1] }, springPop));
    });
    document.addEventListener('frost:cart:opened', () => {
      const lines = $$('[data-cart-drawer] .cart-item');
      if (lines.length) animate(lines, { opacity: [0, 1], x: [24, 0] }, { ...springIn, delay: stagger(0.05, { startDelay: 0.12 }) });
    });
  } catch (err) {
    /* Never leave content hidden if something fails */
    document.documentElement.classList.remove('has-motion-lib');
    $$('[data-reveal], [data-m-hero]').forEach((el) => { el.style.opacity = ''; el.style.transform = ''; });
  }
})();
