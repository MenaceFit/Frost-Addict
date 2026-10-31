/* FROST DISTRICT — motion & conversion layer (no dependencies).
   Everything here is progressive: without JS or with reduced motion, content stays visible and usable. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const F = window.Frost || { strings: {} };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const motionOn = () => document.body.classList.contains('has-motion') && !reduce;

  /* ---------- Split titles into words, reveal on scroll ---------- */
  function initSplit(root = document) {
    const els = $$('[data-split]:not([data-split-done])', root);
    els.forEach((el) => {
      el.dataset.splitDone = '1';
      if (!motionOn()) return;
      let i = 0;
      const walk = (node) => {
        Array.from(node.childNodes).forEach((n) => {
          if (n.nodeType === 3) {
            const frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
              const w = document.createElement('span'); w.className = 'w';
              const inner = document.createElement('span'); inner.textContent = part; inner.style.setProperty('--i', i++);
              w.appendChild(inner); frag.appendChild(w);
            });
            n.replaceWith(frag);
          } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
        });
      };
      el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
      walk(el);
      $$('.w', el).forEach((w) => w.setAttribute('aria-hidden', 'true'));
    });
    if (!motionOn() || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-revealed')); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-revealed'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -10% 0px' });
    els.forEach((e) => io.observe(e));
    setTimeout(() => els.forEach((e) => e.classList.add('is-revealed')), 4000);
  }

  /* ---------- Depth parallax (pointer + scroll) on pre-rendered 3D layers ---------- */
  function initDepth() {
    if (reduce) return;
    $$('[data-depth-root]').forEach((root) => {
      const layers = $$('[data-depth]', root);
      const host = root.closest('section') || root;
      let mx = 0; let my = 0; let tx = 0; let ty = 0; let sy = 0; let raf = null; let visible = true;
      const tick = () => {
        tx += (mx - tx) * 0.08; ty += (my - ty) * 0.08;
        layers.forEach((l) => {
          const d = Number(l.dataset.depth) || 0;
          l.style.transform = `translate3d(${(-tx * d).toFixed(2)}px, ${(-ty * d * 0.6 + sy * d * 0.04).toFixed(2)}px, 0)`;
        });
        raf = visible && (Math.abs(mx - tx) > 0.001 || Math.abs(my - ty) > 0.001) ? requestAnimationFrame(tick) : null;
      };
      const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
      if (finePointer) host.addEventListener('pointermove', (e) => {
        const r = host.getBoundingClientRect();
        mx = (e.clientX - r.left) / r.width - 0.5; my = (e.clientY - r.top) / r.height - 0.5; kick();
      });
      host.addEventListener('pointerleave', () => { mx = 0; my = 0; kick(); });
      window.addEventListener('scroll', () => {
        const r = host.getBoundingClientRect();
        sy = Math.max(-1, Math.min(1, r.top / window.innerHeight)) * -10; kick();
      }, { passive: true });
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); }).observe(host);
    });
  }

  /* ---------- Light snowfall on the 3D hero (canvas, paused off-screen) ---------- */
  function initSnow() {
    if (reduce) return;
    $$('[data-snow]').forEach((canvas) => {
      const ctx = canvas.getContext('2d');
      let w = 0; let h = 0; let flakes = []; let running = false; let raf;
      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = canvas.clientWidth; h = canvas.clientHeight; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const n = Math.round(Math.min(90, (w * h) / 22000));
        flakes = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, r: 0.6 + Math.random() * 2.2, s: 0.3 + Math.random() * 0.9, d: Math.random() * Math.PI * 2 }));
      };
      const draw = () => {
        ctx.clearRect(0, 0, w, h); ctx.fillStyle = 'rgba(255,255,255,.85)';
        flakes.forEach((f) => {
          f.y += f.s; f.d += 0.01; f.x += Math.sin(f.d) * 0.35;
          if (f.y > h + 4) { f.y = -4; f.x = Math.random() * w; }
          ctx.globalAlpha = 0.35 + f.r / 4; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
        });
        if (running) raf = requestAnimationFrame(draw);
      };
      resize(); window.addEventListener('resize', resize);
      new IntersectionObserver(([en]) => {
        running = en.isIntersecting && !document.hidden;
        cancelAnimationFrame(raf); if (running) raf = requestAnimationFrame(draw);
      }).observe(canvas);
    });
  }

  /* ---------- Tilt + light glare on cards (fine pointers only) ---------- */
  function initTilt(root = document) {
    if (!finePointer || reduce) return;
    $$('[data-tilt]:not([data-tilt-done])', root).forEach((el) => {
      el.dataset.tiltDone = '1';
      const target = el.classList.contains('card') ? $('.card__media', el) : el;
      if (!target) return;
      el.addEventListener('pointermove', (e) => {
        const r = target.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width; const py = (e.clientY - r.top) / r.height;
        target.style.setProperty('--ry', ((px - 0.5) * 7).toFixed(2) + 'deg');
        target.style.setProperty('--rx', ((0.5 - py) * 6).toFixed(2) + 'deg');
        target.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        target.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', () => { target.style.setProperty('--rx', '0deg'); target.style.setProperty('--ry', '0deg'); });
    });
  }

  /* ---------- Magnetic primary buttons ---------- */
  function initMagnetic() {
    if (!finePointer || reduce) return;
    $$('[data-magnetic]').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1)}px, ${((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1)}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------- Scroll progress + kinetic band skew ---------- */
  function initScrollFx() {
    const bar = $('[data-scroll-progress]');
    const bands = $$('[data-kinetic] .kinetic__row');
    let last = window.scrollY; let ticking = false; let reset;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.setProperty('--progress', max > 0 ? (window.scrollY / max).toFixed(4) : 0);
      if (!reduce && bands.length) {
        const v = Math.max(-12, Math.min(12, (window.scrollY - last) * 0.4));
        bands.forEach((b) => b.style.setProperty('--skew', `${-v}deg`));
        clearTimeout(reset); reset = setTimeout(() => bands.forEach((b) => b.style.setProperty('--skew', '0deg')), 120);
      }
      last = window.scrollY; ticking = false;
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ---------- Shop the look: dot ↔ list highlighting ---------- */
  function initLook() {
    $$('[data-look]').forEach((look) => {
      const dots = $$('[data-look-dot]', look); const items = $$('[data-look-item]', look);
      const set = (i) => {
        dots.forEach((d, k) => d.classList.toggle('is-active', k === i));
        items.forEach((it, k) => it.classList.toggle('is-active', k === i));
      };
      dots.forEach((d, i) => {
        d.addEventListener('mouseenter', () => set(i)); d.addEventListener('focus', () => set(i));
        d.addEventListener('click', () => { set(i); items[i]?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); });
      });
      items.forEach((it, i) => it.addEventListener('mouseenter', () => set(i)));
    });
  }

  /* ---------- Countdown (real end date from Liquid) ---------- */
  function initCountdown() {
    $$('[data-countdown]').forEach((el) => {
      const end = Number(el.dataset.countdown) * 1000;
      const parts = { days: $('[data-cd="days"]', el), hours: $('[data-cd="hours"]', el), minutes: $('[data-cd="minutes"]', el), seconds: $('[data-cd="seconds"]', el) };
      const pad = (n) => String(n).padStart(2, '0');
      const tick = () => {
        const d = end - Date.now();
        if (d <= 0) { el.hidden = true; return; }
        parts.days.textContent = pad(Math.floor(d / 864e5));
        parts.hours.textContent = pad(Math.floor((d % 864e5) / 36e5));
        parts.minutes.textContent = pad(Math.floor((d % 36e5) / 6e4));
        parts.seconds.textContent = pad(Math.floor((d % 6e4) / 1e3));
        setTimeout(tick, 1000 - (Date.now() % 1000));
      };
      tick();
    });
  }

  /* ---------- Delivery estimate (business days, cut-off hour) ---------- */
  function initDelivery() {
    $$('[data-delivery-estimate]').forEach((el) => {
      const min = Number(el.dataset.min); const max = Number(el.dataset.max); const cutoff = Number(el.dataset.cutoff);
      const addBusiness = (date, n) => { const d = new Date(date); let added = 0; while (added < n) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) added++; } return d; };
      let start = new Date();
      if (start.getHours() >= cutoff || start.getDay() === 0 || start.getDay() === 6) start = addBusiness(start, 1);
      const fmt = new Intl.DateTimeFormat(document.documentElement.lang || 'fr', { weekday: 'short', day: 'numeric', month: 'short' });
      const span = $('[data-delivery-dates]', el);
      if (span) span.textContent = (F.strings.deliveryBetween || '{a} – {b}').replace('{a}', fmt.format(addBusiness(start, min))).replace('{b}', fmt.format(addBusiness(start, max)));
    });
  }

  /* ---------- Newsletter popup (timed + exit intent, frequency-capped) ---------- */
  function initPopup() {
    const pop = $('[data-popup]');
    if (!pop) return;
    const KEY = 'frost-popup-until';
    const success = $('[data-popup-success]', pop);
    let lastFocus;
    const store = (days) => { try { localStorage.setItem(KEY, String(Date.now() + days * 864e5)); } catch (e) { /* storage unavailable */ } };
    const open = () => {
      if (!pop.hidden || $('.drawer.is-open')) return;
      lastFocus = document.activeElement; pop.hidden = false; document.body.classList.add('is-locked');
      setTimeout(() => ($('input[type=email]', pop) || $('.popup__content button', pop) || pop).focus(), 50);
      store(Number(pop.dataset.days) || 14);
    };
    const close = () => { pop.hidden = true; if (!$('.drawer.is-open')) document.body.classList.remove('is-locked'); lastFocus?.focus?.(); };
    $$('[data-popup-close]', pop).forEach((b) => b.addEventListener('click', close));
    pop.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') { // keep focus inside the dialog
        const f = $$('a[href], button:not([disabled]), input:not([type=hidden])', pop).filter((el) => el.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    $$('[data-copy]', pop).forEach((b) => b.addEventListener('click', () => {
      navigator.clipboard?.writeText(b.dataset.copy).then(() => { const s = $('small', b); if (s) s.textContent = F.strings.copied || 'Copié'; });
    }));
    if (success) { open(); return; } // show the confirmation after the form posts back
    let until = 0; try { until = Number(localStorage.getItem(KEY) || 0); } catch (e) { /* ignore */ }
    if (Date.now() < until) return;
    const timer = setTimeout(open, Number(pop.dataset.delay) || 15000);
    if (pop.dataset.exit === 'true' && finePointer) {
      document.addEventListener('mouseout', (e) => { if (!e.relatedTarget && e.clientY <= 0) { clearTimeout(timer); open(); } }, { once: true });
    }
  }

  /* ---------- Cart: fly-to-cart, "added" state, upsell ---------- */
  document.addEventListener('frost:cart:added', (e) => {
    const btn = e.detail && e.detail.button;
    if (!btn) return;
    if (btn.classList.contains('btn')) {
      const label = btn.innerHTML; btn.classList.add('is-added'); btn.textContent = F.strings.added_short || 'Ajouté ✓';
      setTimeout(() => { btn.classList.remove('is-added'); btn.innerHTML = label; }, 1600);
    }
    if (reduce) return;
    const card = btn.closest('.card, .pdp, .hero3d__chip, .look__item, .upsell__item');
    const img = card && $('img', card);
    const cart = $('[data-cart-open]');
    if (!img || !cart) return;
    const a = img.getBoundingClientRect(); const b = cart.getBoundingClientRect();
    if (!a.width) return;
    const fly = img.cloneNode(); fly.className = 'fly-img'; fly.removeAttribute('srcset');
    Object.assign(fly.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
    document.body.appendChild(fly);
    requestAnimationFrame(() => {
      const dx = b.left + b.width / 2 - (a.left + a.width / 2); const dy = b.top + b.height / 2 - (a.top + a.height / 2);
      fly.style.transform = `translate(${dx}px, ${dy}px) scale(${Math.max(0.08, 36 / a.width)})`; fly.style.opacity = '0.2';
    });
    setTimeout(() => fly.remove(), 650);
  });

  let upsellFor = null;
  async function loadUpsell() {
    const slot = $('[data-cart-upsell]');
    if (!slot || !slot.dataset.productId) return;
    const id = slot.dataset.productId;
    if (upsellFor === id && slot.innerHTML.trim()) return;
    const base = F.recommendations || '/recommendations/products';
    for (const intent of ['complementary', 'related']) {
      try {
        const res = await fetch(`${base}?section_id=cart-upsell&product_id=${id}&limit=3&intent=${intent}`);
        if (!res.ok) continue;
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const inner = $('.upsell', doc);
        if (inner) { slot.innerHTML = inner.outerHTML; upsellFor = id; return; }
      } catch (e) { /* optional */ }
    }
  }
  document.addEventListener('frost:cart:opened', loadUpsell);
  document.addEventListener('frost:cart:rendered', () => { upsellFor = null; loadUpsell(); });

  /* ---------- Boot ---------- */
  /* ---------- Announcement marquee: pause / play (WCAG 2.2.2) ---------- */
  function initAnnPause() {
    $$('[data-ann-marquee]').forEach((bar) => {
      const btn = $('[data-ann-pause]', bar);
      if (!btn || btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        const paused = bar.classList.toggle('is-paused');
        btn.setAttribute('aria-pressed', String(paused));
      });
    });
  }

  /* ---------- Podium stacks: fan out on tap (touch) or when scrolled into view ---------- */
  function initPodium(root = document) {
    const touch = window.matchMedia('(hover: none)').matches;
    $$('[data-stack]:not([data-stack-bound])', root).forEach((stack) => {
      stack.dataset.stackBound = '1';
      const card = stack.closest('a.cat-card');
      if (touch && 'IntersectionObserver' in window) {
        let t;
        new IntersectionObserver(([en]) => {
          clearTimeout(t);
          if (en.isIntersecting) t = setTimeout(() => stack.classList.add('is-spread'), stack.closest('[data-podium-hero]') ? 1600 : 450);
          else stack.classList.remove('is-spread');
        }, { threshold: 0.6 }).observe(card || stack.querySelector('.podium-stack__item--center') || stack);
      }
      if (card) return; /* inside a link: never block the card navigation */
      let lastType = 'mouse';
      stack.addEventListener('pointerdown', (e) => { lastType = e.pointerType; });
      stack.addEventListener('click', (e) => {
        if (lastType === 'mouse' || stack.classList.contains('is-spread')) return;
        e.preventDefault(); stack.classList.add('is-spread'); /* first tap opens, second tap follows the link */
      }, true);
      document.addEventListener('pointerdown', (e) => { if (!stack.contains(e.target)) stack.classList.remove('is-spread'); });
    });
  }

  function init() {
    initPodium();
    initAnnPause();
    initSplit(); initDepth(); initSnow(); initTilt(); initMagnetic(); initScrollFx();
    initLook(); initCountdown(); initDelivery(); initPopup();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  document.addEventListener('shopify:section:load', (e) => { initPodium(e.target); initAnnPause(); initSplit(e.target); initTilt(e.target); initLook(); initCountdown(); });
})();
