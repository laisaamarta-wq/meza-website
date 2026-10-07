import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FLAVOURS, SPRING } from '../data/products.js';
import { createBottle } from './bottle.js';
import { Forest } from './forest.js';
import { WORLD_META, paintFlyer, paintForeground } from './worlds.js';
import { worldReady } from '../data/images.js';
import { rng, blurred } from './paint.js';

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const PAL = [...FLAVOURS.map(v => ({ bg: hex(v.bg), glow: hex(v.glow), accent: hex(v.accent) })), { bg: hex(SPRING.bg), glow: hex(SPRING.glow), accent: hex(SPRING.accent) }];
const lerp3 = (a, b, f) => a.map((x, k) => x + (b[k] - x) * f);

export function createStage({ glCanvas, forestCanvas, Q, RM }) {
  // ---------- state, driven by the scroll timelines ----------
  const S = { v: 0, cam: { x: 0, y: 1.12, z: 5 }, look: { x: 0, y: 1.12, z: 0 } };
  const B = FLAVOURS.map((_, i) => ({ x: i ? 7 : 0, y: 0, z: 0, ry: 0, rz: 0, s: 1 }));
  const I = { y: 0, ry: 0, camZ: 0 };
  const O = { active: false, v: 4, cam: { x: 0, y: 1.1, z: 5.6 }, look: { x: 0, y: 1.1, z: 0 }, b: { x: 0, y: -3.5, z: 0, ry: 0, rz: 0, s: 1 } };
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  // ---------- renderers ----------
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, alpha: true, antialias: Q.aa, powerPreference: 'high-performance' });
  let dpr = Math.min(devicePixelRatio || 1, Q.dpr);
  renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const forest = new Forest(forestCanvas, Q);
  // iOS may drop a WebGL context under memory pressure. Rather than freeze, reload once in a lighter mode.
  const onLost = e => {
    e.preventDefault();
    let tried = false; try { tried = sessionStorage.getItem('meza-lite') === '1'; sessionStorage.setItem('meza-lite', '1'); } catch { /* storage off */ }
    if (!tried) location.reload();
  };
  glCanvas.addEventListener('webglcontextlost', onLost);
  forestCanvas.addEventListener('webglcontextlost', onLost);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.05, 60);
  scene.add(camera);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.035).texture;

  const key = new THREE.DirectionalLight(0xfff3e4, 2.4); key.position.set(-3, 4.5, 4); scene.add(key);
  const rimA = new THREE.DirectionalLight(0xffffff, 5.2); rimA.position.set(3.6, 2.2, -3); scene.add(rimA);
  const rimB = new THREE.DirectionalLight(0xffffff, 2.2); rimB.position.set(-3.8, 1.4, -2.6); scene.add(rimB);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.35));

  // ---------- bottles, built on demand ----------
  const bottles = new Array(FLAVOURS.length).fill(null);
  function ensureBottle(i) {
    if (bottles[i]) return bottles[i];
    const b = createBottle(FLAVOURS[i], i, Q, maxAniso);
    b.group.visible = false; scene.add(b.group, b.shadow, b.pool);
    bottles[i] = b;
    return b;
  }

  // ---------- fly-through sprites and soft foreground, per world ----------
  const fx = new Array(WORLD_META.length).fill(null);
  function ensureFx(i) {
    if (fx[i]) return fx[i];
    if (!worldReady(i)) return null;
    const mk = (cnv, op = 1) => {
      const t = new THREE.CanvasTexture(cnv); t.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, opacity: 0, toneMapped: false }));
      m.renderOrder = 20; m.userData.op = op; camera.add(m); return m;
    };
    const sharp = [paintFlyer(i, 0), paintFlyer(i, 1)];
    const sprites = [...sharp, blurred(sharp[0], 9), blurred(sharp[1], 9)];
    const r = rng(99 + i * 5);
    const flyers = Array.from({ length: Q.flyers }, (_, k) => {
      const close = k % 3 === 0;
      const m = mk(sprites[(k % 2) + (close ? 2 : 0)]);
      const side = r() < 0.5 ? -1 : 1;
      const zEnd = close ? -1.1 - r() * 0.4 : -2.2 - r() * 1.2;
      return { m, a: [side * (0.8 + r() * 1.4), -0.9 + r() * 1.8, -6 - r() * 3], b: [-side * (0.5 + r() * 1.1), -0.5 + r() * 1.0, zEnd], rot: (r() - 0.5) * 3, size: close ? 0.32 + r() * 0.2 : 0.14 + r() * 0.16, lag: r() * 0.35 };
    });
    const fgTex = paintForeground(i);
    const fg = [mk(fgTex), mk(fgTex)];
    fx[i] = { flyers, fg };
    return fx[i];
  }

  // ---------- quality & sizing ----------
  let mobile = innerWidth < 760;
  function resize() {
    mobile = innerWidth < 760;
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
    forest.resize();
  }

  // ---------- frame ----------
  const hooks = [];
  let running = false, raf = 0, last = performance.now(), clock = 0, active = true;
  let perfN = 0, perfSum = 0, lastVars = '', slow = 0;
  const root = document.documentElement.style;
  const tmpCol = new THREE.Color(), white = new THREE.Color(1, 1, 1);

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
    if (!active) return;
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;

    const origin = O.active;
    const vf = THREE.MathUtils.clamp(origin ? O.v : S.v, 0, 4);
    const cam = origin ? O.cam : S.cam, look = origin ? O.look : S.look;

    // atmosphere tokens for the UI
    const i0 = Math.floor(vf), i1 = Math.min(4, i0 + 1), f = vf - i0;
    const mixc = k => lerp3(PAL[i0][k], PAL[i1][k], f).map(Math.round);
    const bg = mixc('bg'), glowc = mixc('glow'), acc = mixc('accent');
    const vars = bg.join(' ') + '|' + glowc.join(' ') + '|' + acc.join(' ');
    if (vars !== lastVars) { lastVars = vars; root.setProperty('--bg', bg.join(' ')); root.setProperty('--glow', glowc.join(' ')); root.setProperty('--accent', acc.join(' ')); }
    tmpCol.setRGB(glowc[0] / 255, glowc[1] / 255, glowc[2] / 255, THREE.SRGBColorSpace).lerp(white, 0.35);
    rimA.color.copy(tmpCol);
    key.position.set(-3 + mouse.x * 1.2, 4.5 - mouse.y * 0.8, 4);

    // make sure what is about to be seen exists
    forest.ensure(i0); forest.ensure(Math.min(4, i0 + 1)); // the next world is always ready before the hand-off

    // bottles
    for (let i = 0; i < bottles.length; i++) {
      const s = origin ? (i === 0 ? O.b : null) : B[i];
      const vis = !!s && Math.abs(s.x) < (mobile ? 4.2 : 6) && s.y > -3.2;
      if (vis) ensureBottle(i);
      const b = bottles[i]; if (!b) continue;
      b.group.visible = b.shadow.visible = b.pool.visible = vis;
      if (!vis) continue;
      const g = b.group, intro = (!origin && i === 0);
      const float = RM ? 0 : Math.sin(clock * 0.9 + i * 1.7) * 0.012;
      const wob = RM ? 0 : Math.sin(clock * 0.55 + i) * 0.035;
      g.position.set(s.x, s.y + float + (intro ? I.y : 0), s.z);
      g.rotation.set(mouse.y * 0.05, s.ry + wob + mouse.x * 0.14 + (intro ? I.ry : 0), s.rz);
      g.scale.setScalar(s.s);
      const lift = Math.abs(s.y + (intro ? I.y : 0));
      b.shadow.position.set(s.x - s.rz * 0.3, -0.004, s.z); b.shadow.scale.setScalar(s.s * (1 + lift * 0.8));
      b.shadow.material.opacity = 0.45 * Math.max(0, 1 - Math.abs(s.rz) * 2.2) * Math.max(0, 1 - lift * 1.6);
      b.pool.position.set(s.x + 0.35 * s.s, -0.003, s.z + 0.35 * s.s); b.pool.scale.setScalar(s.s);
      b.pool.material.opacity = 0.3 * Math.max(0, 1 - Math.abs(s.rz) * 2.5) * Math.max(0, 1 - lift * 1.6);
      b.liquid.material.uniforms.uTime.value = clock;
      if (b.bubbles && !RM) {
        const p = b.bubbles.geometry.attributes.position;
        for (let k = 0; k < p.count; k++) { let y = p.array[k * 3 + 1] + b.bub[k] * dt; if (y > 1.95) y = 0.08; p.array[k * 3 + 1] = y; }
        p.needsUpdate = true;
      }
    }

    camera.position.set(cam.x + mouse.x * 0.08, cam.y - mouse.y * 0.05, cam.z + (origin ? 0 : I.camZ));
    camera.lookAt(look.x, look.y, look.z);
    const dist = Math.hypot(cam.x - look.x, cam.y - look.y, cam.z - look.z);
    const focus = THREE.MathUtils.clamp((3.4 - dist) / 2.2, 0, 1);

    // fly-through and foreground frames
    fx.forEach(e => e && [...e.flyers.map(o => o.m), ...e.fg].forEach(m => (m.visible = false)));
    if (!RM) {
      const dest = Math.ceil(vf - 1e-4), tp = vf - Math.floor(vf);
      if (dest > 0 && dest < 5 && tp > 0.01 && tp < 0.99) {
        const e = ensureFx(dest);
        if (e) e.flyers.forEach(o => {
          const p = THREE.MathUtils.clamp((tp - o.lag * 0.5) / 0.75, 0, 1); if (p <= 0 || p >= 1) return;
          const m = o.m; m.visible = true;
          m.position.set(o.a[0] + (o.b[0] - o.a[0]) * p, o.a[1] + (o.b[1] - o.a[1]) * p + Math.sin(p * Math.PI) * 0.25, o.a[2] + (o.b[2] - o.a[2]) * p);
          m.rotation.z = o.rot * p; m.scale.setScalar(o.size * (mobile ? 0.8 : 1));
          m.material.opacity = Math.sin(p * Math.PI) * 0.95;
        });
      }
    }
    const nearest = Math.round(vf), wgt = 1 - Math.min(1, Math.abs(vf - nearest) * 2.2);
    const efg = wgt > 0 && !origin ? ensureFx(nearest) : null;
    if (efg) {
      const [a, bm] = efg.fg;
      const op = wgt * (1 - focus * 0.5) * (mobile ? 0.65 : 0.85);
      a.visible = bm.visible = op > 0.01;
      a.material.opacity = bm.material.opacity = op;
      const hh = 1.9 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), hw = hh * camera.aspect, sz = hh * (mobile ? 0.62 : 0.95);
      a.position.set(-hw + sz * 0.32 + Math.sin(clock * 0.3) * 0.01, -hh + sz * 0.3 + Math.sin(clock * 0.4) * 0.01, -1.9); a.scale.set(sz, sz, 1); a.rotation.z = 0.12;
      bm.position.set(hw - sz * 0.28, hh - sz * (mobile ? 0.62 : 0.42), -1.9); bm.scale.set(-sz * 0.85, sz * 0.85, 1); bm.rotation.z = 0.35;
    }

    forest.update(dt, vf, { x: cam.x * 0.35 + (look.x - cam.x) * 0.15, y: (cam.y - 1.1) * 0.35, dolly: THREE.MathUtils.clamp((5 - dist) * 0.3, -1.2, 1.2), focus, mouseX: mouse.x, mouseY: mouse.y });
    forest.render();
    renderer.render(scene, camera);
    for (const h of hooks) h({ camera, bottles, vf, origin });

    perfSum += dt; perfN++;
    if (perfN === 90) {
      const avg = (perfSum / perfN) * 1000; perfN = 0; perfSum = 0;
      // step resolution down only when frames are clearly slow, twice in a row, and never below a
      // sharp floor on high-density screens (the forest behind is already rendered soft and cheap)
      slow = avg > 30 ? slow + 1 : 0;
      const floor = Math.min(devicePixelRatio || 1, 1.5);
      if (slow >= 2 && dpr > floor) { slow = 0; dpr = Math.max(floor, dpr - 0.25); renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight, false); }
    }
  }

  function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function setActive(on) {
    active = on;
    glCanvas.style.visibility = forestCanvas.style.visibility = on ? '' : 'hidden';
  }

  // ---------- product shots for the shop, rendered from the same bottles ----------
  // Product shots for the shop, rendered with the SAME WebGL context as the scene.
  // (A third context next to the bottle and the forest is exactly what iPhones refuse.)
  // Each shot resizes the drawing buffer, renders, reads it back and restores the scene
  // inside one task, so the screen never shows the in-between frame.
  async function renderShots() {
    const W = 520, H = 780;
    const shotScene = new THREE.Scene();
    shotScene.environment = scene.environment;
    const k = new THREE.DirectionalLight(0xfff3e4, 2.6); k.position.set(-3, 4.5, 4);
    const ra = new THREE.DirectionalLight(0xffffff, 4); ra.position.set(3.6, 2.2, -3);
    const rb = new THREE.DirectionalLight(0xffffff, 2); rb.position.set(-3.8, 1.4, -2.6);
    shotScene.add(k, ra, rb, new THREE.HemisphereLight(0xffffff, 0x222222, 0.35));
    const cam = new THREE.PerspectiveCamera(22, W / H, 0.1, 50);
    const out = {};
    const shoot = (items, camPos, look, w = W, h = H) => {
      const saved = items.map(({ b }) => ({ b, parent: b.group.parent, p: b.group.position.clone(), r: b.group.rotation.clone(), s: b.group.scale.clone(), vis: b.group.visible }));
      items.forEach(({ b, x, z, ry }) => { shotScene.add(b.group); b.group.visible = true; b.group.position.set(x, 0, z); b.group.rotation.set(0, ry, 0); b.group.scale.setScalar(1); });
      cam.aspect = w / h; cam.updateProjectionMatrix();
      cam.position.set(...camPos); cam.lookAt(...look);
      const pr = renderer.getPixelRatio(), exp = renderer.toneMappingExposure;
      renderer.setPixelRatio(1); renderer.setSize(w, h, false); renderer.toneMappingExposure = 1.1;
      renderer.setClearColor(0, 0); renderer.clear(); renderer.render(shotScene, cam);
      const url = renderer.domElement.toDataURL('image/png');
      saved.forEach(({ b, parent, p, r, s, vis }) => { parent.add(b.group); b.group.position.copy(p); b.group.rotation.copy(r); b.group.scale.copy(s); b.group.visible = vis; });
      renderer.toneMappingExposure = exp; renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false);
      renderer.render(scene, camera); // put the live frame straight back
      return url;
    };
    for (let i = 0; i < FLAVOURS.length; i++) {
      const b = ensureBottle(i);
      out[FLAVOURS[i].id] = shoot([{ b, x: 0, z: 0, ry: -0.42 }], [0, 1.18, 6.4], [0, 1.1, 0]);
      await new Promise(r => setTimeout(r, 40));
    }
    const all = FLAVOURS.map((_, i) => ({ b: ensureBottle(i), x: (i - 1.5) * 0.62, z: i % 2 ? -0.45 : 0, ry: -0.3 + i * 0.05 }));
    // the case is shot wide so all four bottles fit with air around them
    out['meza-mix'] = shoot(all, [0, 1.6, 8.3], [0, 1.02, 0], 900, 760);
    return out;
  }

  addEventListener('pointermove', e => { if (RM || e.pointerType === 'touch') return; mouse.tx = (e.clientX / innerWidth - 0.5) * 2; mouse.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  return {
    S, B, I, O, mouse, renderer, camera, scene, forest, bottles, ensureBottle, ensureFx,
    onFrame: fn => hooks.push(fn), start, stop, setActive, resize, renderShots,
    compile: () => renderer.compile(scene, camera),
    get mobile() { return mobile; },
  };
}
