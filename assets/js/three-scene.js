/* Ads4You — WebGL tube-joint scene
   Geometry language reverse-engineered from lusion.co via REA:
   hollow cylinders, cross/Y connectors, glossy black + matte white + electric blue,
   soft studio lighting, dark backdrop.

   Pure Three.js (r160) via ESM CDN import map, single-file, no build step. */

import * as THREE from 'three';

const PALETTE = {
  black: 0x0a0a10,
  white: 0xf0f1fa,
  blue: 0x1a2ffb,
  darkBlue: 0x071bdf,
  green: 0xc1ff00,
  grey: 0x2b2e3a,
};

function makeTubeMaterial(color, { rough = 0.28, metal = 0.15 } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: metal,
    envMapIntensity: 1.4,
  });
}

/** A hollow open-ended cylinder — Lusion's signature pipe form. */
function makeTube(radius, length, material, radialSeg = 40) {
  const outer = new THREE.CylinderGeometry(radius, radius, length, radialSeg, 1, true);
  const inner = new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, length * 1.002, radialSeg, 1, true);
  inner.scale(-1, 1, 1); // flip winding so we see the inside wall
  const rimTop = new THREE.RingGeometry(radius * 0.72, radius, radialSeg);
  const rimBot = new THREE.RingGeometry(radius * 0.72, radius, radialSeg);
  rimTop.rotateX(-Math.PI / 2);
  rimBot.rotateX(Math.PI / 2);
  rimBot.translate(0, -length / 2, 0);

  const group = new THREE.Group();
  group.add(new THREE.Mesh(outer, material));
  group.add(new THREE.Mesh(inner, material));
  group.add(new THREE.Mesh(rimTop, material));
  const bot = new THREE.Mesh(rimBot, material);
  bot.position.y = length / 2;
  group.add(bot);
  return group;
}

/** A connector hub: sphere body with several tube arms. */
function makeConnector(radius, arms, material, armLen, armRadius) {
  const group = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 28), material);
  group.add(hub);
  for (let i = 0; i < arms; i++) {
    const arm = makeTube(armRadius, armLen, material);
    // push arm outward from hub centre
    arm.position.set(0, armLen / 2 + radius * 0.55, 0);
    const holder = new THREE.Group();
    holder.add(arm);
    holder.rotation.z = Math.random() * Math.PI * 2;
    holder.rotation.x = (Math.random() - 0.5) * 1.1;
    group.add(holder);
  }
  return group;
}

/** Solid rounded bar (Lusion shows a mix of tubes and slabs). */
function makeSlab(w, h, d, material) {
  const geo = new THREE.BoxGeometry(w, h, d, 2, 2, 2);
  const mesh = new THREE.Mesh(geo, material);
  return mesh;
}

export function createScene(canvas, opts = {}) {
  const {
    count = 26,
    cameraZ = 9,
    accentRatio = 0.28,
    bg = 0x05060c,
    autoRotate = true,
  } = opts;

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
  renderer.shadowMap.enabled = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.42;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  scene.fog = new THREE.FogExp2(bg, 0.028);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, cameraZ);

  // ---- Lighting: bright studio key + rim + fill (Lusion look) ----
  scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x20263a, 2.4));
  scene.add(new THREE.AmbientLight(0x8e9ac0, 1.35));
  const key = new THREE.DirectionalLight(0xffffff, 4.2);
  key.position.set(5, 7, 7);
  scene.add(key);
  const key2 = new THREE.DirectionalLight(0xffffff, 2.0);
  key2.position.set(-6, 3, 4);
  scene.add(key2);
  const rim = new THREE.DirectionalLight(0x7f8cff, 2.6);
  rim.position.set(-5, -3, -5);
  scene.add(rim);
  const fill = new THREE.PointLight(0xffffff, 55, 44);
  fill.position.set(-4, 4, 6);
  scene.add(fill);
  const fill2 = new THREE.PointLight(0x1a2ffb, 38, 36);
  fill2.position.set(5, -2, 4);
  scene.add(fill2);

  const matBlack = makeTubeMaterial(0x14141f, { rough: 0.2, metal: 0.5 });
  const matWhite = makeTubeMaterial(PALETTE.white, { rough: 0.4, metal: 0.05 });
  const matBlue = makeTubeMaterial(PALETTE.blue, { rough: 0.22, metal: 0.3 });
  const matDarkBlue = makeTubeMaterial(PALETTE.darkBlue, { rough: 0.28, metal: 0.28 });
  const matGrey = makeTubeMaterial(0x555c73, { rough: 0.45, metal: 0.18 });

  const root = new THREE.Group();
  scene.add(root);

  const parts = [];
  const rand = (a, b) => a + Math.random() * (b - a);

  // Composition: a tight cluster biased to the right of frame, so headline copy
  // on the left stays clean. Same visual grammar as lusion.co's hero.
  const biasX = opts.biasX === undefined ? 0 : opts.biasX;

  for (let i = 0; i < count; i++) {
    const r = Math.random();
    let obj;
    if (r < 0.46) {
      obj = makeTube(rand(0.26, 0.62), rand(1.8, 4.6), Math.random() < accentRatio ? matBlue : (Math.random() < 0.5 ? matBlack : matWhite));
    } else if (r < 0.76) {
      obj = makeConnector(rand(0.38, 0.7), Math.random() < 0.5 ? 3 : 4, Math.random() < accentRatio ? matDarkBlue : (Math.random() < 0.5 ? matBlack : matWhite), rand(1.1, 2.4), rand(0.18, 0.34));
    } else if (r < 0.9) {
      obj = makeTube(rand(0.34, 0.56), rand(1.4, 3.0), Math.random() < 0.5 ? matBlack : matGrey);
    } else {
      obj = makeSlab(rand(0.9, 2.0), rand(0.55, 1.2), rand(0.45, 1.0), Math.random() < 0.35 ? matGrey : matBlack);
    }

    // Place on a shell around the cluster centre -> reads as one dense assembly.
    // Panels get biasX 0 (centred); the hero uses a positive bias to clear the copy.
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = rand(0.9, 3.3);
    obj.position.set(
      radius * Math.sin(phi) * Math.cos(theta) + biasX,
      radius * Math.sin(phi) * Math.sin(theta) * 0.8,
      radius * Math.cos(phi) * 0.6 + rand(-0.8, 0.8),
    );
    obj.rotation.set(rand(0, Math.PI), rand(0, Math.PI), rand(0, Math.PI));
    obj.userData.spin = rand(-0.14, 0.14);
    obj.userData.float = rand(0.1, 0.4);
    obj.userData.phase = Math.random() * Math.PI * 2;
    root.add(obj);
    parts.push(obj);
  }

  // mouse parallax
  const pointer = { x: 0, y: 0 };
  const onMove = (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  let scrollT = 0;         // 0..1 overall scroll progress
  let localT = 0;          // panel-local progress
  let visible = true;
  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
  }, { threshold: 0.01 });
  io.observe(canvas);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const clock = new THREE.Clock();
  let raf = 0;

  function frame() {
    raf = requestAnimationFrame(frame);
    if (!visible) return;

    const t = clock.getElapsedTime();
    const dt = Math.min(clock.getDelta ? 0.016 : 0.016, 0.05);

    if (!reduce) {
      if (autoRotate) root.rotation.y += 0.0016 * (60 / 60);
      root.rotation.y += pointer.x * 0.0016;
      root.rotation.x += (pointer.y * 0.0012 - root.rotation.x) * 0.04;

      for (const p of parts) {
        p.rotation.y += p.userData.spin * 0.006;
        p.rotation.x += p.userData.spin * 0.0032;
        p.position.y += Math.sin(t * p.userData.float + p.userData.phase) * 0.0012;
      }
    }

    // scroll-driven dolly + spin for a "scroll changes the scene" feel
    const dolly = 1 + scrollT * 0.42 - localT * 0.2;
    camera.position.z += (cameraZ * dolly - camera.position.z) * 0.06;
    root.rotation.z = scrollT * 0.9 + localT * 0.25;

    renderer.render(scene, camera);
  }
  frame();

  return {
    setScroll(p) { scrollT = Math.max(0, Math.min(1, p)); },
    setLocal(p) { localT = Math.max(0, Math.min(1, p)); },
    dispose() {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      renderer.dispose();
    },
  };
}

export default createScene;
