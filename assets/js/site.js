/* Ads4You — site behaviour: smooth scroll, reveals, nav, WebGL panels */

(() => {
  const doc = document.documentElement;

  // ---- Sticky nav state ----
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('is-stuck', window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ---- Mobile nav sheet ----
  const burger = document.querySelector('.nav__burger');
  const sheet = document.querySelector('.nav__sheet');
  if (burger && sheet) {
    const setOpen = (open) => {
      document.body.classList.toggle('nav-open', open);
      document.body.classList.toggle('is-locked', open);
      burger.setAttribute('aria-expanded', String(open));
    };
    burger.addEventListener('click', () => setOpen(!document.body.classList.contains('nav-open')));
    sheet.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }

  // ---- Reveal on scroll ----
  const revealables = document.querySelectorAll('[data-reveal]');
  if (revealables.length) {
    const rio = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          rio.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealables.forEach((el) => rio.observe(el));
  }

  // ---- Cursor glow (desktop only) ----
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    document.body.appendChild(glow);
    document.body.classList.add('has-pointer');
    let gx = 0, gy = 0, cx = 0, cy = 0;
    window.addEventListener('pointermove', (e) => {
      gx = e.clientX; gy = e.clientY;
    }, { passive: true });
    const tick = () => {
      cx += (gx - cx) * 0.12;
      cy += (gy - cy) * 0.12;
      glow.style.left = cx + 'px';
      glow.style.top = cy + 'px';
      requestAnimationFrame(tick);
    };
    tick();
  }

  // ---- WebGL panels ----
  const panels = document.querySelectorAll('[data-scene]');
  if (panels.length) {
    import('./three-scene.js')
      .then(({ createScene }) => {
        const instances = [];
        panels.forEach((canvas) => {
          const opts = {};
          if (canvas.dataset.count) opts.count = parseInt(canvas.dataset.count, 10);
          if (canvas.dataset.cameraZ) opts.cameraZ = parseFloat(canvas.dataset.cameraZ);
          if (canvas.dataset.bg) opts.bg = parseInt(canvas.dataset.bg, 16);
          if (canvas.dataset.biasX) opts.biasX = parseFloat(canvas.dataset.biasX);
          const inst = createScene(canvas, opts);
          if (inst) instances.push({ inst, canvas });
        });

        // Global scroll progress -> every scene
        let ticking = false;
        const update = () => {
          const max = document.body.scrollHeight - window.innerHeight;
          const p = max > 0 ? window.scrollY / max : 0;
          instances.forEach(({ inst }) => inst.setScroll(p));
          ticking = false;
        };
        window.addEventListener('scroll', () => {
          if (!ticking) { ticking = true; requestAnimationFrame(update); }
        }, { passive: true });
        update();

        // Panel-local progress -> camera push
        const localObs = new IntersectionObserver((entries) => {
          entries.forEach((en) => {
            const rec = instances.find((i) => i.canvas === en.target);
            if (!rec) return;
            const r = en.boundingClientRect;
            const vh = window.innerHeight;
            const local = 1 - (r.top + r.height / 2) / vh;
            rec.inst.setLocal(Math.max(0, Math.min(1, local)));
          });
        }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
        instances.forEach(({ canvas }) => localObs.observe(canvas));
      })
      .catch((err) => {
        console.warn('[ads4you] 3D scene unavailable, CSS fallback active', err && err.message);
        document.querySelectorAll('[data-scene]').forEach((c) => {
          c.style.background = 'radial-gradient(60% 55% at 50% 40%, #232a44 0%, #05060c 72%)';
        });
      });
  }

  // ---- Contact form (mailto fallback, no backend) ----
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

  // ---- Year stamp ----
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
})();
