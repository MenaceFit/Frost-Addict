/* FROST DISTRICT — storefront scripts (no dependencies). */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const F = window.Frost || { routes: {}, strings: {} };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const routes = Object.assign({ root: '/', cart: '/cart', cartAdd: '/cart/add', cartChange: '/cart/change', predictiveSearch: '/search/suggest' }, F.routes);
  const strings = F.strings || {};

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(message) {
    const el = $('#Toast');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('is-visible'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('is-visible');
      setTimeout(() => { el.hidden = true; }, 400);
    }, 2600);
  }

  /* ---------- Drawers (menu, cart, filters) ---------- */
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';
  let lastFocus = null;

  function openDrawer(drawer, trigger) {
    if (!drawer) return;
    lastFocus = trigger || document.activeElement;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    const panel = $('.drawer__panel', drawer) || drawer;
    setTimeout(() => (panel.querySelector(FOCUSABLE) || panel).focus(), 60);
    if (drawer.matches('[data-cart-drawer]')) document.dispatchEvent(new CustomEvent('frost:cart:opened'));
  }

  function closeDrawer(drawer) {
    if (!drawer || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (!$('.drawer.is-open, .search-modal.is-open')) document.body.classList.remove('is-locked');
    $$('[aria-expanded="true"][data-menu-open], [aria-expanded="true"][data-filters-open]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  function trapFocus(e) {
    const open = $('.drawer.is-open .drawer__panel, .search-modal.is-open .search-modal__panel');
    if (!open || e.key !== 'Tab') return;
    const items = $$(FOCUSABLE, open).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      $$('.drawer.is-open').forEach(closeDrawer);
      closeSearch();
    }
    trapFocus(e);
  });

  document.addEventListener('click', (e) => {
    const t = e.target;
    const menuBtn = t.closest('[data-menu-open]');
    if (menuBtn) { openDrawer($('[data-menu-drawer]'), menuBtn); return; }
    const filtersBtn = t.closest('[data-filters-open]');
    if (filtersBtn) { openDrawer($('[data-filters-drawer]'), filtersBtn); return; }
    const cartBtn = t.closest('[data-cart-open]');
    if (cartBtn && F.cartType === 'drawer' && $('[data-cart-drawer]') && !document.body.classList.contains('template-cart')) {
      e.preventDefault();
      openDrawer($('[data-cart-drawer]'), cartBtn);
      return;
    }
    const closeBtn = t.closest('[data-drawer-close]');
    if (closeBtn) { closeDrawer(closeBtn.closest('.drawer')); }
  });

  /* ---------- Header ---------- */
  function initHeader() {
    const header = $('[data-header]');
    if (header) {
      const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      const h = header.offsetHeight;
      if (h) document.documentElement.style.setProperty('--header-h', h + 'px');
    }
    // Dropdowns: keyboard + touch support (hover handled in CSS)
    $$('[data-dropdown]').forEach((item) => {
      const link = $('.nav__link', item);
      item.addEventListener('mouseenter', () => link.setAttribute('aria-expanded', 'true'));
      item.addEventListener('mouseleave', () => { link.setAttribute('aria-expanded', 'false'); item.classList.remove('is-open'); });
      link.addEventListener('click', (e) => {
        if (window.matchMedia('(hover: none)').matches && !item.classList.contains('is-open')) {
          e.preventDefault();
          item.classList.add('is-open');
          link.setAttribute('aria-expanded', 'true');
        }
      });
      item.addEventListener('focusout', (e) => {
        if (!item.contains(e.relatedTarget)) { item.classList.remove('is-open'); link.setAttribute('aria-expanded', 'false'); }
      });
    });
    $$('select[data-autosubmit]').forEach((sel) => sel.addEventListener('change', () => sel.form && sel.form.submit()));
  }

  /* ---------- Announcement bar ---------- */
  function initAnnouncement() {
    const bar = $('[data-announcement]');
    if (!bar) return;
    const msgs = $$('.announcement__msg', bar);
    if (msgs.length < 2) return;
    let i = 0;
    let timer = null;
    const show = (n) => {
      msgs[i].classList.remove('is-active');
      msgs[i].setAttribute('aria-hidden', 'true');
      i = (n + msgs.length) % msgs.length;
      msgs[i].classList.add('is-active');
      msgs[i].removeAttribute('aria-hidden');
    };
    const start = () => { if (!reduceMotion) { stop(); timer = setInterval(() => show(i + 1), Number(bar.dataset.interval) || 5000); } };
    const stop = () => clearInterval(timer);
    $('[data-announcement-next]', bar)?.addEventListener('click', () => { show(i + 1); start(); });
    $('[data-announcement-prev]', bar)?.addEventListener('click', () => { show(i - 1); start(); });
    bar.addEventListener('mouseenter', stop);
    bar.addEventListener('mouseleave', start);
    bar.addEventListener('focusin', stop);
    bar.addEventListener('focusout', start);
    start();
  }

  /* ---------- Hero ---------- */
  function initHero() {
    $$('[data-hero]').forEach((hero) => {
      const slides = $$('[data-slide]', hero);
      const dots = $$('[data-hero-dot]', hero);
      let i = 0;
      let timer = null;
      let paused = hero.dataset.autoplay !== 'true' || reduceMotion;
      const go = (n) => {
        if (slides.length < 2) return;
        slides[i].classList.remove('is-active');
        slides[i].setAttribute('aria-hidden', 'true');
        dots[i]?.removeAttribute('aria-current');
        i = (n + slides.length) % slides.length;
        slides[i].classList.add('is-active');
        slides[i].removeAttribute('aria-hidden');
        dots[i]?.setAttribute('aria-current', 'true');
        const img = $('img[loading="lazy"]', slides[i]);
        if (img) img.loading = 'eager';
      };
      const play = () => { clearInterval(timer); if (!paused) timer = setInterval(() => go(i + 1), Number(hero.dataset.interval) || 7000); };
      dots.forEach((d) => d.addEventListener('click', () => { go(Number(d.dataset.heroDot)); play(); }));
      $('[data-hero-next]', hero)?.addEventListener('click', () => { go(i + 1); play(); });
      $('[data-hero-prev]', hero)?.addEventListener('click', () => { go(i - 1); play(); });
      const pauseBtn = $('[data-hero-pause]', hero);
      if (pauseBtn) {
        if (paused) pauseBtn.hidden = true;
        pauseBtn.addEventListener('click', () => {
          paused = !paused;
          pauseBtn.setAttribute('aria-pressed', String(paused));
          pauseBtn.textContent = paused ? '▶' : (strings.pause || 'Pause');
          play();
        });
      }
      hero.addEventListener('mouseenter', () => clearInterval(timer));
      hero.addEventListener('mouseleave', play);
      hero.addEventListener('focusin', () => clearInterval(timer));
      // Swipe
      let x0 = null;
      hero.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
      hero.addEventListener('touchend', (e) => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 50) { go(dx < 0 ? i + 1 : i - 1); play(); }
        x0 = null;
      });
      play();
    });
  }

  /* ---------- Parallax (hero + banners), light and transform-only ---------- */
  function initParallax() {
    if (reduceMotion) return;
    const targets = $$('[data-parallax] [data-parallax-target], .banner [data-parallax-target]');
    if (!targets.length) return;
    let ticking = false;
    const update = () => {
      const vh = window.innerHeight;
      targets.forEach((t) => {
        const r = t.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const progress = (r.top + r.height / 2 - vh / 2) / vh; // -1..1
        t.style.setProperty('--parallax', (progress * -40).toFixed(1) + 'px');
        $$('img', t).forEach((img) => { img.style.setProperty('--parallax', (progress * -40).toFixed(1) + 'px'); });
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ---------- Carousels ---------- */
  function initCarousels(root = document) {
    $$('[data-carousel]', root).forEach((c) => {
      if (c.dataset.ready) return;
      c.dataset.ready = '1';
      const track = $('[data-carousel-track]', c);
      const prev = $('[data-carousel-prev]', c);
      const next = $('[data-carousel-next]', c);
      const bar = $('[data-carousel-progress]', c);
      const update = () => {
        const max = track.scrollWidth - track.clientWidth;
        c.classList.toggle('is-static', max <= 4);
        if (prev) prev.disabled = track.scrollLeft <= 4;
        if (next) next.disabled = track.scrollLeft >= max - 4;
        if (bar) {
          const ratio = track.clientWidth / track.scrollWidth;
          const pos = max > 0 ? track.scrollLeft / max : 0;
          bar.style.setProperty('--w', (ratio * 100).toFixed(2) + '%');
          bar.style.setProperty('--x', ((1 / ratio - 1) * pos * 100).toFixed(2) + '%');
        }
      };
      const step = () => {
        const item = track.children[0];
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        const w = item ? item.getBoundingClientRect().width + gap : track.clientWidth;
        return Math.max(w, Math.floor(track.clientWidth / w) * w);
      };
      prev?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reduceMotion ? 'auto' : 'smooth' }));
      next?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: reduceMotion ? 'auto' : 'smooth' }));
      track.addEventListener('keydown', (e) => {
        if (e.target !== track) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); next?.click(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); prev?.click(); }
      });
      track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
      window.addEventListener('resize', update);
      update();
    });
  }

  /* ---------- Tabs ---------- */
  function initTabs() {
    $$('[data-tabs]').forEach((wrap) => {
      const tabs = $$('[role="tab"]', wrap);
      const select = (tab, animate = true) => {
        tabs.forEach((t) => {
          const on = t === tab;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          const panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) {
            panel.hidden = !on;
            if (on) {
              panel.classList.remove('is-entering');
              void panel.offsetWidth;
              if (animate) panel.classList.add('is-entering');
              $$('[data-reveal]', panel).forEach((el) => el.classList.add('is-revealed'));
            }
          }
        });
      };
      tabs.forEach((t, idx) => {
        t.addEventListener('click', (e) => select(t, e.detail > 0)); // no motion for keyboard activation
        t.addEventListener('keydown', (e) => {
          let n = null;
          if (e.key === 'ArrowRight') n = tabs[(idx + 1) % tabs.length];
          if (e.key === 'ArrowLeft') n = tabs[(idx - 1 + tabs.length) % tabs.length];
          if (n) { e.preventDefault(); n.focus(); select(n, false); }
        });
      });
    });
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveal(root = document) {
    const els = $$('[data-reveal]:not(.is-revealed)', root);
    if (!document.body.classList.contains('has-motion') || reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-revealed'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    els.forEach((el) => io.observe(el));
    // Safety net: never leave content hidden.
    setTimeout(() => els.forEach((el) => el.classList.add('is-revealed')), 3500);
  }

  /* ---------- Cart ---------- */
  function sectionsUrl() { return window.location.pathname; }

  function renderCartSections(sections) {
    if (!sections) return;
    const html = sections['cart-drawer'];
    if (html) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const fresh = $('[data-cart-drawer]', doc);
      const current = $('[data-cart-drawer]');
      if (fresh && current) {
        const wasOpen = current.classList.contains('is-open');
        $('.drawer__panel', current).replaceWith($('.drawer__panel', fresh));
        current.dataset.count = fresh.dataset.count;
        if (wasOpen) current.classList.add('is-open');
        setCount(Number(fresh.dataset.count));
        document.dispatchEvent(new CustomEvent('frost:cart:rendered'));
      }
    }
  }

  function setCount(count) {
    $$('[data-cart-count]').forEach((el) => {
      el.textContent = count;
      el.hidden = count === 0;
      el.classList.remove('is-bump');
      void el.offsetWidth;
      el.classList.add('is-bump');
    });
  }

  async function addToCart(payload, button) {
    button?.classList.add('is-loading');
    try {
      const isForm = payload instanceof FormData;
      if (isForm) {
        payload.append('sections', 'cart-drawer');
        payload.append('sections_url', sectionsUrl());
      } else {
        payload.sections = 'cart-drawer';
        payload.sections_url = sectionsUrl();
      }
      const res = await fetch(routes.cartAdd + '.js', {
        method: 'POST',
        headers: isForm ? { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } : { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: isForm ? payload : JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.status) throw new Error(data.description || data.message || strings.error);
      if (F.cartType === 'drawer' && $('[data-cart-drawer]')) {
        renderCartSections(data.sections);
        openDrawer($('[data-cart-drawer]'), button);
      } else {
        window.location.href = routes.cart;
      }
      toast(strings.added || 'Ajouté au panier');
      document.dispatchEvent(new CustomEvent('frost:cart:added', { detail: { button } }));
      return true;
    } catch (err) {
      toast(err.message || strings.error);
      return false;
    } finally {
      button?.classList.remove('is-loading');
    }
  }

  async function changeLine(line, quantity) {
    const lines = $$('[data-cart-lines]');
    lines.forEach((l) => l.classList.add('is-updating'));
    try {
      const res = await fetch(routes.cartChange + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ line, quantity, sections: 'cart-drawer', sections_url: sectionsUrl() }),
      });
      const data = await res.json();
      if (!res.ok || data.status) throw new Error(data.description || strings.error);
      if ($('[data-cart-page]')) { window.location.reload(); return; }
      renderCartSections(data.sections);
    } catch (err) {
      toast(err.message || strings.error);
      lines.forEach((l) => l.classList.remove('is-updating'));
    }
  }

  document.addEventListener('click', (e) => {
    const change = e.target.closest('[data-qty-change]');
    if (change) {
      e.preventDefault();
      changeLine(Number(change.dataset.qtyChange), Math.max(0, Number(change.dataset.qty)));
      return;
    }
    const quick = e.target.closest('[data-quick-add]');
    if (quick) {
      e.preventDefault();
      addToCart({ items: [{ id: Number(quick.dataset.quickAdd), quantity: 1 }] }, quick).then((ok) => {
        if (ok) { const panel = quick.closest('[data-quick-panel]'); if (panel) togglePanel(panel, false); }
      });
      return;
    }
    const toggle = e.target.closest('[data-quick-toggle]');
    if (toggle) {
      const panel = toggle.parentElement.querySelector('[data-quick-panel]');
      togglePanel(panel, panel.hidden);
      return;
    }
    const qclose = e.target.closest('[data-quick-close]');
    if (qclose) togglePanel(qclose.closest('[data-quick-panel]'), false);
  });

  function togglePanel(panel, show) {
    if (!panel) return;
    const btn = panel.parentElement.querySelector('[data-quick-toggle]');
    panel.hidden = !show;
    if (btn) { btn.hidden = show; btn.setAttribute('aria-expanded', String(show)); }
    if (show) $('button:not([disabled])', panel)?.focus();
    else btn?.focus();
  }

  document.addEventListener('change', (e) => {
    const input = e.target.closest('[data-qty-input]');
    if (input) changeLine(Number(input.dataset.qtyInput), Math.max(0, Number(input.value)));
  });

  /* ---------- Product page ---------- */
  function initProduct() {
    $$('[data-product]').forEach((section) => {
      const json = $('[data-product-json]', section);
      if (!json) return;
      const data = JSON.parse(json.textContent);
      const form = $('[data-product-form]', section);
      const idInput = $('[data-variant-id]', section);
      const addBtn = $('[data-add-button]', section);
      const addLabel = $('[data-add-label]', section);
      const stock = $('[data-stock]', section);
      const priceWrap = $('[data-price-wrap] [data-price]', section);
      const stickyPrice = $('[data-sticky-price]', section);
      const sticky = $('[data-sticky-atc]', section);
      const stickyAdd = $('[data-sticky-add]', section);

      const selected = () => $$('fieldset.option', section).map((fs) => ($('input:checked', fs) || {}).value);
      const priceHTML = (v) => `
        <div class="price${v.compare ? ' price--on-sale' : ''}" data-price>
          <span class="price__current"><span class="visually-hidden">${v.compare ? data.strings.sale : data.strings.regular}</span>${v.price}</span>
          ${v.compare ? `<s class="price__compare"><span class="visually-hidden">${data.strings.regular}</span>${v.compare}</s>` : ''}
        </div>`;

      const update = () => {
        const opts = selected();
        $$('fieldset.option', section).forEach((fs, idx) => {
          const label = $('[data-option-selected]', fs);
          if (label) label.textContent = opts[idx] || '';
          // Mark values that have no available variant with the other current choices
          $$('.option__value', fs).forEach((wrap) => {
            const val = $('input', wrap).value;
            const test = opts.slice(); test[idx] = val;
            const match = data.variants.find((v) => v.options.every((o, k) => o === test[k]));
            wrap.classList.toggle('is-unavailable', !match || !match.available);
          });
        });
        const variant = data.variants.find((v) => v.options.every((o, k) => o === opts[k]));
        if (!variant) {
          if (addBtn) { addBtn.disabled = true; addLabel.textContent = strings.unavailable; }
          return;
        }
        idInput.value = variant.id;
        if (addBtn) { addBtn.disabled = !variant.available; addLabel.textContent = variant.available ? strings.addToCart : strings.soldOut; }
        if (stickyAdd) stickyAdd.disabled = !variant.available;
        if (priceWrap) priceWrap.outerHTML = priceHTML(variant).replace('class="price', 'class="price price--lg');
        if (stickyPrice) stickyPrice.innerHTML = priceHTML(variant);
        if (stock) {
          stock.classList.remove('pdp__stock--low', 'pdp__stock--out');
          if (!variant.available) { stock.textContent = data.strings.outOfStock; stock.classList.add('pdp__stock--out'); }
          else if (variant.tracked && variant.qty > 0 && variant.qty <= data.lowStock) { stock.textContent = data.strings.lowStock.replace('__n__', variant.qty); stock.classList.add('pdp__stock--low'); }
          else stock.textContent = data.strings.inStock;
        }
        const url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url);
        if (variant.media) {
          const media = $(`[data-media-id="${variant.media}"]`, section);
          const track = $('[data-gallery-track]', section);
          if (media && track) {
            if (track.scrollWidth > track.clientWidth) track.scrollTo({ left: media.offsetLeft - track.offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
            else if (media !== track.firstElementChild) { track.prepend(media); }
          }
        }
      };
      $$('fieldset.option input', section).forEach((input) => input.addEventListener('change', update));
      if ($$('fieldset.option', section).length) update();

      $$('[data-qty-step]', section).forEach((b) => b.addEventListener('click', () => {
        const input = b.parentElement.querySelector('input');
        input.value = Math.max(1, Number(input.value || 1) + Number(b.dataset.qtyStep));
      }));

      form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const err = $('[data-form-error]', section);
        if (err) err.hidden = true;
        addToCart(new FormData(form), addBtn).then((ok) => { if (!ok && err) { err.hidden = false; err.textContent = strings.error; } });
      });

      // Sticky add-to-cart on mobile when the main button is out of view
      if (sticky && addBtn && 'IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => {
          const show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
          sticky.classList.toggle('is-visible', show);
          sticky.setAttribute('aria-hidden', String(!show));
          if (stickyAdd) stickyAdd.tabIndex = show ? 0 : -1;
        }).observe(addBtn);
        stickyAdd?.addEventListener('click', () => form.requestSubmit ? form.requestSubmit() : form.submit());
      }

      // Gallery dots on mobile
      const track = $('[data-gallery-track]', section);
      const dots = $$('.gallery__dots span', section);
      if (track && dots.length) {
        track.addEventListener('scroll', () => {
          const idx = Math.round(track.scrollLeft / (track.children[0].getBoundingClientRect().width + 8));
          dots.forEach((d, k) => d.classList.toggle('is-active', k === idx));
        }, { passive: true });
      }
    });
  }

  /* ---------- Recommendations ---------- */
  function initRecommendations() {
    $$('[data-recommendations]').forEach(async (el) => {
      if (!el.dataset.url || el.children.length) return;
      try {
        const res = await fetch(el.dataset.url);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const fresh = $('[data-recommendations]', doc);
        if (fresh && fresh.innerHTML.trim()) {
          el.innerHTML = fresh.innerHTML;
          initCarousels(el);
          initReveal(el);
        }
      } catch (e) { /* recommendations are optional */ }
    });
  }

  /* ---------- Collection filters & sort ---------- */
  function initFacets() {
    let timer;
    const submit = (form) => {
      const params = new URLSearchParams(new FormData(form));
      for (const [k, v] of Array.from(params.entries())) if (v === '') params.delete(k);
      window.location.search = params.toString();
    };
    $$('[data-facets-form]').forEach((form) => {
      form.addEventListener('change', (e) => {
        if (e.target.matches('[data-autosubmit]')) submit(form);
      });
      form.addEventListener('input', (e) => {
        if (e.target.matches('[data-autosubmit-delay]')) { clearTimeout(timer); timer = setTimeout(() => submit(form), 800); }
      });
    });
    $$('[data-sort]').forEach((sel) => sel.addEventListener('change', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('sort_by', sel.value);
      url.searchParams.delete('page');
      window.location.href = url.toString();
    }));
  }

  /* ---------- Search modal + predictive search ---------- */
  const modal = () => $('[data-search-modal]');
  function openSearch(trigger) {
    const m = modal();
    if (!m) return;
    lastFocus = trigger;
    m.classList.add('is-open');
    document.body.classList.add('is-locked');
    setTimeout(() => $('[data-predictive-input]', m)?.focus(), 60);
  }
  function closeSearch() {
    const m = modal();
    if (!m || !m.classList.contains('is-open')) return;
    m.classList.remove('is-open');
    if (!$('.drawer.is-open')) document.body.classList.remove('is-locked');
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener('click', (e) => {
    const open = e.target.closest('[data-search-open]');
    if (open) { e.preventDefault(); $$('.drawer.is-open').forEach(closeDrawer); openSearch(open); return; }
    if (e.target.closest('[data-search-close]')) closeSearch();
  });
  function initPredictive() {
    const input = $('[data-predictive-input]');
    const out = $('[data-predictive-results]');
    if (!input || !out) return;
    let timer;
    let controller;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      const q = input.value.trim();
      if (q.length < 2) { out.innerHTML = ''; return; }
      timer = setTimeout(async () => {
        controller?.abort();
        controller = new AbortController();
        try {
          const url = `${routes.predictiveSearch}?q=${encodeURIComponent(q)}&section_id=predictive-search&resources[type]=product,collection,query&resources[limit]=6&resources[options][fields]=title,product_type,variants.title,vendor`;
          const res = await fetch(url, { signal: controller.signal });
          const html = await res.text();
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const section = $('#shopify-section-predictive-search', doc);
          out.innerHTML = section ? section.innerHTML : '';
        } catch (e) { /* aborted or offline */ }
      }, 220);
    });
  }

  /* ---------- Boot ---------- */
  function init() {
    initHeader();
    initAnnouncement();
    initHero();
    initParallax();
    initCarousels();
    initTabs();
    initReveal();
    initProduct();
    initRecommendations();
    initFacets();
    initPredictive();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Theme editor: re-init a section when it is re-rendered
  document.addEventListener('shopify:section:load', (e) => {
    initCarousels(e.target);
    initReveal(e.target);
    initHero();
    initTabs();
    initAnnouncement();
  });
})();
