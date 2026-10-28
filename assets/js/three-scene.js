/* Ads4You — WebGL scene
   Geometry language reverse-engineered from lusion.co via REA:
   hollow pipes with visible bore, elbow/T/cross fittings, glossy black +
   satin white + electric blue, studio key/rim/fill, near-black backdrop.

   Shared module: one file, many canvases, configured by data-attributes. */

import * as THREE from 'three';

const PALETTE = {
  white: 0xe9eaf0,
  black: 0x101018,
  blue: 0x1a2ffb,
  darkBlue: 0x0d1bb0,
  grey: 0x3a3f52,
};

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function std(color, { rough = 0.3, metal = 0.12 } = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

/** Hollow pipe with a visible bore and a collar ring — Lusion's core form. */
function makePipe(radius, length, material, seg = 36) {
  const g = new THREE.Group();

  const outer = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, seg, 1, true),
    material
  );
  g.add(outer);

  const innerGeo = new THREE.CylinderGeometry(radius * 0.68, radius * 0.68, length * 1.004, seg, 1, true);
  innerGeo.scale(-1, 1, 1); // flip winding so we see the inside wall
  const inner = new THREE.Mesh(innerGeo, material);
  g.add(inner);

  const rim = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.68, radius, seg),
    material
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = length / 2;
  g.add(rim);

  const rimB = rim.clone();
  rimB.rotation.x = Math.PI / 2;
  rimB.position.y = -length / 2;
  g.add(rimB);

  // collar — gives the pipe a manufactured joint
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.04, radius * 0.13, 10, seg),
    material
  );
  collar.rotation.x = Math.PI / 2;
  g.add(collar);

  return g;
}

/** A fitting: hub sphere + N pipe arms at varied angles. */
function makeFitting(hubR, arms, material, armLen, armR) {
  const g = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.SphereGeometry(hubR, 32, 22), material);
  g.add(hub);

  for (let i = 0; i < arms; i++) {
    const arm = makePipe(armR, armLen, material, 24);
    arm.position.y = armLen / 2 + hubR * 0.42;
    const holder = new THREE.Group();
    holder.add(arm);
    holder.rotation.z = (i / arms) * Math.PI * 2 + Math.random() * 0.6;
    holder.rotation.x = (Math.random() - 0.5) * 0.9;
    g.add(holder);
  }
  return g;
}

/** Rounded block — the glossy slab in lusion's scenes. */
function makeBlock(w, h, d, material) {
  const geo = new THREE.BoxGeometry(w, h, d, 2, 2, 2);
  return new THREE.Mesh(geo, material);
}

export function createScene(canvas, opts = {}) {
  const {
    count = 22,
    cameraZ = 9,
    accentRatio = 0.26,
    bg = 0x08090f,
    autoRotate = true,
    seed = 1,
  } = opts;

  // deterministic-ish RNG so each panel keeps its composition across reloads
  let s = seed * 9301 + 49297;
  const rand = (a, b) => {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    return a + r * (b - a);
  };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
  } catch (e) {
    return null;
  }
  if (!renderer.getContext()) return null;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  scene.fog = new THREE.FogExp2(bg, 0.012);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, cameraZ);

  // studio lighting — key, fill, rim, coloured accent
  scene.add(new THREE.HemisphereLight(0xeef1ff, 0x2a3045, 3.0));
  scene.add(new THREE.AmbientLight(0xb2bde0, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 5.4);
  key.position.set(5, 7, 8);
  scene.add(key);
  const key2 = new THREE.DirectionalLight(0xffffff, 2.8);
  key2.position.set(-7, 3, 5);
  scene.add(key2);
  const rim = new THREE.DirectionalLight(0x93a0ff, 3.6);
  rim.position.set(-4, -3, -6);
  scene.add(rim);
  const fill = new THREE.PointLight(0xffffff, 75, 46);
  fill.position.set(-4, 5, 7);
  scene.add(fill);
  const accent = new THREE.PointLight(0x1a2ffb, 52, 38);
  accent.position.set(6, -1, 5);
  scene.add(accent);

  const matWhite = std(PALETTE.white, { rough: 0.42, metal: 0.05 });
  const matBlack = std(PALETTE.black, { rough: 0.16, metal: 0.55 });
  const matBlue = std(PALETTE.blue, { rough: 0.2, metal: 0.34 });
  const matDarkBlue = std(PALETTE.darkBlue, { rough: 0.26, metal: 0.3 });
  const matGrey = std(PALETTE.grey, { rough: 0.42, metal: 0.22 });

  const root = new THREE.Group();
  scene.add(root);

  // Hero copy sits on the left, so push the assembly right of centre.
  if (opts.offsetX) root.position.x = opts.offsetX;

  const parts = [];
  for (let i = 0; i < count; i++) {
    const r = rand(0, 1);
    let obj;
    if (r < 0.5) {
      obj = makePipe(rand(0.24, 0.58), rand(1.8, 4.8),
        rand(0, 1) < accentRatio ? matBlue : (rand(0, 1) < 0.5 ? matBlack : matWhite));
    } else if (r < 0.78) {
      obj = makeFitting(rand(0.34, 0.62), rand(0, 1) < 0.5 ? 3 : 4,
        rand(0, 1) < accentRatio ? matDarkBlue : (rand(0, 1) < 0.5 ? matBlack : matWhite),
        rand(1.0, 2.2), rand(0.16, 0.3));
    } else if (r < 0.9) {
      obj = makePipe(rand(0.3, 0.52), rand(1.2, 2.8), rand(0, 1) < 0.5 ? matBlack : matGrey);
    } else {
      obj = makeBlock(rand(0.9, 1.9), rand(0.5, 1.1), rand(0.4, 0.9),
        rand(0, 1) < 0.35 ? matGrey : matBlack);
    }

    // tight cluster so it reads as one dense assembly (lusion's framing).
    // Spread on a shell, but keep the whole assembly within the camera frustum.
    const theta = rand(0, Math.PI * 2);
    const phi = Math.acos(2 * rand(0, 1) - 1);
    const radius = rand(0.6, 2.4);
    const sx = Math.sin(phi) * Math.cos(theta);
    const sy = Math.sin(phi) * Math.sin(theta);
    const sz = Math.cos(phi);
    obj.position.set(
      sx * radius * 1.35,
      sy * radius * 1.05,
      sz * radius * 0.9
    );
    obj.rotation.set(rand(0, Math.PI), rand(0, Math.PI), rand(0, Math.PI));
    obj.userData.spin = rand(-0.13, 0.13);
    obj.userData.phase = rand(0, Math.PI * 2);
    root.add(obj);
    parts.push(obj);
  }

  const pointer = { x: 0, y: 0 };
  const onMove = (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  let scrollT = 0;
  let localT = 0;
  let visible = true;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    // the canvas may be laid out later (virtual scroll, preloader) — keep retrying
    if (w < 4 || h < 4) return false;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    return true;
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // belt-and-braces: force a size pass on the next few frames and on load
  let resizeTries = 0;
  const resizeTimer = setInterval(() => {
    resizeTries += 1;
    if (resize() || resizeTries > 40) clearInterval(resizeTimer);
  }, 120);
  window.addEventListener('load', resize);
  window.addEventListener('ads4you:ready', resize);

  const clock = new THREE.Clock();
  let raf = 0;

  function frame() {
    raf = requestAnimationFrame(frame);
    if (!visible) return;
    const t = clock.getElapsedTime();

    if (!reduce) {
      if (autoRotate) root.rotation.y += 0.0013;
      root.rotation.y += pointer.x * 0.0014;
      root.rotation.x += (pointer.y * 0.0010 - root.rotation.x) * 0.04;
      for (const p of parts) {
        p.rotation.y += p.userData.spin * 0.005;
        p.rotation.x += p.userData.spin * 0.0028;
        p.position.y += Math.sin(t * 0.5 + p.userData.phase) * 0.0011;
      }
    }

    // scroll-linked camera + roll
    const dolly = 1 + scrollT * 0.36 - localT * 0.16;
    camera.position.z += (cameraZ * dolly - camera.position.z) * 0.06;
    root.rotation.z = scrollT * 0.8 + localT * 0.22;

    renderer.render(scene, camera);
  }
  frame();

  return {
    setScroll(p) { scrollT = Math.max(0, Math.min(1, p)); },
    setLocal(p) { localT = Math.max(0, Math.min(1, p)); },
    setVisible(v) { visible = v; },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      renderer.dispose();
    },
  };
}

/* ---------- bootstrap all canvases ---------- */
const registry = new Map();

function boot() {
  document.querySelectorAll('[data-scene]').forEach((canvas, i) => {
    const opts = { seed: i + 1 };
    if (canvas.dataset.count) opts.count = parseInt(canvas.dataset.count, 10);
    if (canvas.dataset.cameraZ) opts.cameraZ = parseFloat(canvas.dataset.cameraZ);
    if (canvas.dataset.bg) opts.bg = parseInt(canvas.dataset.bg, 16);
    if (canvas.dataset.offsetX) opts.offsetX = parseFloat(canvas.dataset.offsetX);
    const inst = createScene(canvas, opts);
    if (inst) registry.set(canvas, inst);
  });
  window.__ads4youScenes = registry;
}

boot();
