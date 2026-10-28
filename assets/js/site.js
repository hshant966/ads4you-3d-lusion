/* Ads4You — virtual scroll engine, preloader, split-text reveals.
   Architecture mirrors lusion.co: document is locked (overflow:hidden),
   a fixed viewport holds a translated inner container, wheel/touch/key
   drive a target that the render loop lerps toward. */

(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ==========================================================
     1. SPLIT TEXT
     Wrap each word's characters in spans so they can stagger up
     from behind a line mask (lusion's split-line pattern).
     ========================================================== */
  function splitText(el) {
    if (el.dataset.split === 'done') return;
    const text = el.textContent.trim();
    el.textContent = '';
    const words = text.split(/\s+/);
    words.forEach((word, wi) => {
      const wordWrap = document.createElement('span');
      wordWrap.className = 'split-word';
      for (const ch of word) {
        const c = document.createElement('span');
        c.className = 'split-char';
        c.textContent = ch;
        wordWrap.appendChild(c);
      }
      el.appendChild(wordWrap);
      if (wi < words.length - 1) {
        const sp = document.createElement('span');
        sp.className = 'split-space';
        sp.textContent = ' ';
        el.appendChild(sp);
      }
    });
    el.dataset.split = 'done';
  }

  document.querySelectorAll('[data-split]').forEach(splitText);

  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add('is-revealed');
        revealIO.unobserve(en.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('[data-split]').forEach((el) => revealIO.observe(el));

  /* ==========================================================
     2. VIRTUAL SCROLL
     ========================================================== */
  const inner = document.querySelector('.vscroll__inner');
  const sections = () => Array.from(document.querySelectorAll('[data-scene-section]'));

  let target = 0;
  let current = 0;
  let maxScroll = 0;
  let running = false;

  function measure() {
    if (!inner) return;
    inner.style.position = 'static';
    inner.style.transform = 'none';
    maxScroll = Math.max(0, inner.getBoundingClientRect().height - window.innerHeight);
    inner.style.position = 'absolute';
    applyTransform();
  }

  function applyTransform() {
    if (!inner) return;
    inner.style.transform = `translate3d(0, ${-current}px, 0)`;
  }

  function scrollToY(y, instant) {
    const max = Math.max(0, maxScroll);
    target = Math.max(0, Math.min(max, y));
    if (instant || reduce) {
      current = target;
      applyTransform();
    }
  }

  function tick() {
    if (!running) return;
    current += (target - current) * (reduce ? 1 : 0.09);
    if (Math.abs(target - current) < 0.05) current = target;
    applyTransform();
    updateSceneProgress();
    updateRail();
    requestAnimationFrame(tick);
  }

  function startTick() {
    if (running) return;
    running = true;
    tick();
  }

  window.addEventListener('wheel', (e) => {
    if (document.body.classList.contains('nav-open')) return;
    e.preventDefault();
    scrollToY(target + e.deltaY * (e.deltaMode === 1 ? 18 : 1));
  }, { passive: false });

  let touchY = 0;
  let touchT = 0;
  window.addEventListener('touchstart', (e) => {
    touchY = e.touches[0].clientY;
    touchT = Date.now();
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (document.body.classList.contains('nav-open')) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    const dy = touchY - y;
    const mult = Date.now() - touchT > 90 ? 2.4 : 1.4;
    scrollToY(target + dy * mult);
    touchY = y;
    touchT = Date.now();
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (document.body.classList.contains('nav-open')) return;
    const vh = window.innerHeight;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); scrollToY(target + vh * 0.85); }
    if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); scrollToY(target - vh * 0.85); }
    if (e.key === 'Home') { e.preventDefault(); scrollToY(0); }
    if (e.key === 'End') { e.preventDefault(); scrollToY(maxScroll); }
  });

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      const y = t.getBoundingClientRect().top + current - window.innerHeight * 0.08;
      scrollToY(y);
    });
  });

  /* --- scene progress --- */
  const sceneEls = Array.from(document.querySelectorAll('[data-scene]'));

  const sceneIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const inst = window.__ads4youScenes && window.__ads4youScenes.get(en.target);
      if (inst) inst.setVisible(en.isIntersecting);
    });
  }, { threshold: 0.01 });
  sceneEls.forEach((c) => sceneIO.observe(c));

  function updateSceneProgress() {
    const vh = window.innerHeight;
    const max = Math.max(1, (inner ? inner.getBoundingClientRect().height : 0) - vh);
    sceneEls.forEach((c) => {
      const inst = window.__ads4youScenes && window.__ads4youScenes.get(c);
      if (!inst) return;
      const r = c.getBoundingClientRect();
      const local = 1 - (r.top + r.height / 2) / vh;
      inst.setLocal(Math.max(0, Math.min(1, local)));
      inst.setScroll(Math.max(0, Math.min(1, current / max)));
    });
  }

  /* --- progress rail --- */
  const rail = document.querySelector('.rail');
  const railDots = rail ? Array.from(rail.querySelectorAll('i')) : [];
  function updateRail() {
    if (!railDots.length) return;
    const secs = sections();
    const vh = window.innerHeight;
    let active = 0;
    secs.forEach((s, i) => {
      const top = s.getBoundingClientRect().top;
      if (top <= vh * 0.5) active = i;
    });
    railDots.forEach((d, i) => d.classList.toggle('on', i === active));
  }

  /* ==========================================================
     3. PRELOADER
     ========================================================== */
  const preloader = document.querySelector('.preloader');
  const pctEl = document.querySelector('.preloader__pct');
  const barEl = document.querySelector('.preloader__bar i');
  const metaEl = document.querySelector('.preloader__meta span:last-child');

  function renderPct(n) {
    if (!pctEl) return;
    const str = String(Math.min(100, Math.max(0, Math.round(n)))).padStart(3, '0');
    pctEl.textContent = '';
    for (const ch of str) {
      const d = document.createElement('span');
      d.className = 'preloader__digit';
      const s = document.createElement('span');
      s.textContent = ch;
      d.appendChild(s);
      pctEl.appendChild(d);
    }
  }

  let preloaded = false;
  let preloadTimer = 0;
  function finishPreload() {
    if (preloaded) return;
    preloaded = true;
    clearTimeout(preloadTimer);
    if (!preloader) {
      document.body.classList.add('virtual');
      measure(); startTick();
      return;
    }
    // time-based so a throttled rAF cannot stall the counter
    const t0 = performance.now();
    const DUR = 1400;
    const step = () => {
      const p = Math.min(100, ((performance.now() - t0) / DUR) * 100);
      renderPct(p);
      if (barEl) barEl.style.width = p + '%';
      if (metaEl) metaEl.textContent = 'loading ' + Math.round(p) + '%';
      if (p < 100) { requestAnimationFrame(step); return; }
      setTimeout(() => {
        preloader.classList.add('done');
        document.body.classList.add('virtual');
        measure();
        scrollToY(0, true);
        startTick();
        window.dispatchEvent(new Event('ads4you:ready'));
      }, 300);
    };
    requestAnimationFrame(step);
  }

  /* ==========================================================
     4. NAV
     ========================================================== */
  const burger = document.querySelector('.header__burger');
  const setNav = (open) => {
    document.body.classList.toggle('nav-open', open);
    if (burger) burger.setAttribute('aria-expanded', String(open));
  };
  if (burger) {
    burger.addEventListener('click', () => setNav(!document.body.classList.contains('nav-open')));
    document.querySelectorAll('.menu a').forEach((a) => a.addEventListener('click', () => setNav(false)));
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setNav(false); });

  /* ==========================================================
     5. FORM
     ========================================================== */
  const form = document.getElementById('enquiry');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = (data.get('name') || '').trim();
      const email = (data.get('email') || '').trim();
      const msg = (data.get('message') || '').trim();
      const subject = encodeURIComponent(`Ads4You enquiry — ${name || 'new lead'}`);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${msg}`);
      window.location.href = `mailto:ads4you@zohomail.com?subject=${subject}&body=${body}`;
      const ok = document.getElementById('form-ok');
      if (ok) {
        ok.hidden = false;
        ok.textContent = 'Opening your email app — if nothing happens, write to ads4you@zohomail.com';
      }
    });
  }

  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  /* ==========================================================
     6. BOOT
     ========================================================== */
  window.addEventListener('resize', () => measure());
  window.__ads4youScroll = { get: () => current, getTarget: () => target, scrollToY, measure };

  renderPct(0);
  window.addEventListener('load', () => { preloadTimer = setTimeout(finishPreload, 150); });
  // hard fallback: the preloader must never trap the page
  preloadTimer = setTimeout(() => { if (!preloaded) finishPreload(); }, 2500);
  setTimeout(() => {
    if (!preloaded) {
      const pl = document.getElementById('preloader');
      if (pl) pl.classList.add('done');
      document.body.classList.add('virtual');
      measure();
      scrollToY(0, true);
      startTick();
    }
  }, 6000);
})();
