import './fonts.css';
import './styles.css';

import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import { FLAVOURS } from './data/products.js';
import { createStage } from './scene/stage.js';
import { buildExperience, buildOrigin, ANCHORS } from './scene/choreo.js';
import { LBL, R, DISP, BODY, MONO } from './scene/label.js';
import { CAP_TOP } from './scene/bottle.js';
import { mountPlates } from './ui/plates.js';
import { loadWorld } from './data/images.js';
import { mountFooter } from './ui/footer.js';
import { mountShop, mountCart, setImages, openCart } from './shop/ui.js';

window.__mezaBooted = true;
gsap.registerPlugin(ScrollTrigger);
history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
const $ = s => document.querySelector(s);

// ---------- loader ----------
const loader = (() => {
  const num = $('#ldNum'), bar = $('#ldBar');
  let shown = 0, target = 0.05, done = null;
  const tick = () => {
    shown += (target - shown) * 0.12;
    if (target >= 1 && shown > 0.995) shown = 1;
    num.textContent = String(Math.round(shown * 100)).padStart(3, '0');
    bar.style.transform = `scaleX(${shown})`;
    if (shown >= 1 && done) { const d = done; done = null; d(); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return {
    set(p, msg) { target = Math.max(target, p); if (msg) $('#ldMsg').textContent = msg; },
    finish(cb) { target = 1; done = cb; },
    fail(msg) { const m = $('#ldMsg'); m.textContent = msg; m.className = 'mono ld-err'; },
  };
})();

// ---------- device tiers ----------
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
// Apple devices report a reduced core count on purpose, so cores alone would mark every iPhone as
// low-power and render it at 1× — visibly pixelated on a 3× screen. Only trust signals that are honest.
const apple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
const lowPower = !apple && ((navigator.deviceMemory || 8) <= 2 || (navigator.hardwareConcurrency || 8) <= 2);
// Phones get their own profile: the bottle stays sharp (2×), the forest behind it is lighter on memory,
// because iPhone browsers and in-app previews cap total canvas memory far below a laptop's.
const phone = coarse && Math.min(screen.width, screen.height) < 820;
let lite = false; try { lite = sessionStorage.getItem('meza-lite') === '1'; } catch { /* storage off */ }
const TIER = lowPower || lite ? 'low' : phone ? 'phone' : (innerWidth < 760 || coarse ? 'mid' : 'high');
const Q = {
  high: { dpr: 2, labelW: 2048, seg: 112, bubbles: 90, aa: true, forestTex: 1600, forestScale: 0.7, particles: 140, flyers: 9, dropRes: 1024, plateScale: 1 },
  mid: { dpr: 2, labelW: 2048, seg: 80, bubbles: 60, aa: true, forestTex: 1280, forestScale: 0.6, particles: 90, flyers: 7, dropRes: 768, plateScale: 0.85 },
  phone: { dpr: 1.75, labelW: 1536, seg: 80, bubbles: 30, aa: true, forestTex: 900, forestScale: 0.45, particles: 60, flyers: 5, dropRes: 512, plateScale: 0.8, keepWorlds: 1 },
  low: { dpr: 1.25, keepWorlds: 1, labelW: 1024, seg: 56, bubbles: 0, aa: false, forestTex: 960, forestScale: 0.5, particles: 50, flyers: 5, dropRes: 512, plateScale: 0.7 },
}[TIER];

async function boot() {
  loader.set(0.15, 'Walking into the forest');
  await Promise.race([
    Promise.all([
      document.fonts.load(`800 100px ${DISP}`, 'MEŽA'), document.fonts.load(`600 40px ${BODY}`), document.fonts.load(`italic 400 26px ${BODY}`),
      document.fonts.load(`500 24px ${MONO}`, 'DEPOZĪTS €0'), document.fonts.load(`400 100px ${DISP}`, 'Nº 01'),
    ]),
    new Promise(r => setTimeout(r, 3500)),
  ]);

  let stage;
  try { stage = createStage({ glCanvas: $('#gl'), forestCanvas: $('#forest'), Q, RM }); }
  catch (e) { loader.fail('This page needs WebGL, which is turned off or unavailable in this browser.'); throw e; }
  const { S, B, I, O } = stage;

  // the first scene loads first: one forest, one bottle
  loader.set(0.35, 'Painting the dune forest');
  await loadWorld(0);
  await frame(); stage.forest.ensure(0);
  loader.set(0.6, 'Printing the first label');
  await frame(); stage.ensureBottle(0);
  loader.set(0.8, 'Chilling the bottle');

  // ---------- smooth scroll ----------
  let lenis = null;
  if (!RM) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const lock = on => { document.body.classList.toggle('locked', on); if (lenis) on ? lenis.stop() : lenis.start(); };

  // ---------- timelines ----------
  let mobile = innerWidth < 760;
  let exp = buildExperience({ S, B, RM, mobile, scrollEl: $('#experience') });
  let org = buildOrigin({ O, RM, mobile, section: $('#origin') });
  const plates = mountPlates();
  mountFooter({ RM });

  const go = name => {
    let y;
    if (['top', 'v0', 'v1', 'v2', 'v3', 'range', 'end'].includes(name)) {
      const p = name === 'top' ? 0 : exp.tl.labels[name] / exp.tl.duration();
      y = exp.st.start + (exp.st.end - exp.st.start) * Math.min(1, p + (name === 'top' ? 0 : 0.004));
    } else y = $('#' + name).getBoundingClientRect().top + scrollY;
    lenis ? (lenis.start(), lenis.scrollTo(y, { duration: Math.min(3.2, 1.2 + Math.abs(y - scrollY) / 4000), force: true })) : window.scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' });
  };

  // ---------- menu ----------
  const menu = $('#menu'), menuBtn = $('#menuBtn');
  const setMenu = open => {
    if (open) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('open')); menu.querySelector('a').focus(); }
    else { menu.classList.remove('open'); setTimeout(() => { if (!menu.classList.contains('open')) menu.hidden = true; }, 700); }
    menuBtn.setAttribute('aria-expanded', open); lock(open);
  };
  menuBtn.addEventListener('click', () => setMenu(true));
  $('#menuClose').addEventListener('click', () => { setMenu(false); menuBtn.focus(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-go]'); if (!a) return;
    e.preventDefault();
    if (menu.classList.contains('open')) setMenu(false);
    go(a.dataset.go);
  });
  menu.querySelector('[data-open-cart]').addEventListener('click', () => { setMenu(false); });

  // ---------- shop ----------
  let shotsStarted = false;
  mountShop(() => {
    if (shotsStarted) return; shotsStarted = true;
    idle(async () => setImages(await stage.renderShots()));
  });
  mountCart({ lock, go });

  // ---------- which stage is on screen ----------
  const vis = { experience: true, origin: false };
  const updateStage = () => {
    const on = vis.experience || vis.origin;
    stage.setActive(on);
    O.active = !vis.experience && vis.origin;
    document.body.classList.toggle('off-stage', !vis.experience);
    $('#nav').classList.toggle('nav-off', !vis.experience);
  };
  const io = new IntersectionObserver(es => { es.forEach(e => (vis[e.target.id] = e.isIntersecting)); updateStage(); }, { rootMargin: '0px' });
  io.observe($('#experience')); io.observe($('#origin'));
  ScrollTrigger.create({ trigger: '#story', start: 'top 80px', endTrigger: '.foot', end: 'bottom bottom', toggleClass: { targets: '#nav', className: 'solid' } });

  // ---------- copy anchored to the product, every frame ----------
  const ang = u => -LBL / 2 + u * LBL;
  const onLabel = (u, y) => new THREE.Vector3(Math.sin(ang(u)) * (R + 0.002), y, Math.cos(ang(u)) * (R + 0.002));
  const anchorLocal = {
    c0a: onLabel(ANCHORS.sugar.u, ANCHORS.sugar.y),
    c0b: onLabel(ANCHORS.botanical.u, ANCHORS.botanical.y),
    c0c: new THREE.Vector3(0.03, CAP_TOP + 0.002, 0.03),
  };
  anchorLocal.c1 = anchorLocal.c2 = anchorLocal.c3 = anchorLocal.c0b;
  const callouts = [...document.querySelectorAll('.co')].map(el => ({ el, inner: el.querySelector('.ci'), b: +el.dataset.b, id: el.id }));
  const tags = [...document.querySelectorAll('.tag')].map(el => ({ el, inner: el.querySelector('.ti'), b: +el.dataset.b }));
  const tmp = new THREE.Vector3();
  const shown = el => el.style.visibility === 'inherit' || el.style.visibility === 'visible';
  const nowNo = $('#nowNo'), nowName = $('#nowName'), railFill = $('#railFill');
  let lastIdx = -1;
  stage.onFrame(({ camera, bottles, vf, origin }) => {
    if (origin) return;
    for (const c of callouts) {
      if (!shown(c.inner) || !bottles[c.b]) continue;
      tmp.copy(anchorLocal[c.id]); bottles[c.b].group.localToWorld(tmp); tmp.project(camera);
      c.el.style.transform = `translate3d(${((tmp.x + 1) / 2 * innerWidth).toFixed(1)}px, ${((1 - tmp.y) / 2 * innerHeight).toFixed(1)}px, 0)`;
    }
    for (const t of tags) {
      if (!shown(t.inner) || !bottles[t.b]) continue;
      const g = bottles[t.b].group; tmp.set(g.position.x, g.position.y - 0.04, g.position.z).project(camera);
      t.el.style.transform = `translate3d(${((tmp.x + 1) / 2 * innerWidth).toFixed(1)}px, ${((1 - tmp.y) / 2 * innerHeight).toFixed(1)}px, 0)`;
    }
    const idx = Math.round(vf);
    if (idx !== lastIdx) {
      lastIdx = idx;
      nowNo.textContent = idx === 4 ? 'Nº 01–04' : 'Nº ' + FLAVOURS[idx].no;
      nowName.textContent = idx === 4 ? 'At the spring' : FLAVOURS[idx].short;
    }
    railFill.style.transform = `scaleY(${exp.st.progress.toFixed(4)})`;
  });

  // ---------- resize ----------
  let lastW = innerWidth;
  addEventListener('resize', () => {
    stage.resize();
    const m = innerWidth < 760;
    if (m !== mobile) {
      mobile = m;
      const p = exp.st.progress;
      exp.st.kill(); exp.tl.kill(); org.st.kill(); org.tl.kill();
      exp = buildExperience({ S, B, RM, mobile, scrollEl: $('#experience') });
      org = buildOrigin({ O, RM, mobile, section: $('#origin') });
      exp.tl.progress(p); ScrollTrigger.refresh();
    } else if (innerWidth !== lastW) ScrollTrigger.refresh();
    lastW = innerWidth;
  });

  // ---------- magnetic buttons ----------
  if (!RM && !coarse) document.addEventListener('pointermove', e => {
    const el = e.target.closest?.('[data-magnetic]');
    document.querySelectorAll('[data-magnetic].is-mag').forEach(m => { if (m !== el) { m.classList.remove('is-mag'); m.style.transform = ''; } });
    if (!el) return;
    const b = el.getBoundingClientRect();
    el.classList.add('is-mag');
    el.style.transform = `translate(${(e.clientX - b.left - b.width / 2) * 0.22}px, ${(e.clientY - b.top - b.height / 2) * 0.3}px)`;
  }, { passive: true });

  // ---------- grain ----------
  {
    const c = document.createElement('canvas'); c.width = c.height = 160;
    const g = c.getContext('2d'), d = g.createImageData(160, 160);
    for (let k = 0; k < d.data.length; k += 4) { const n = Math.random() * 255; d.data[k] = d.data[k + 1] = d.data[k + 2] = n; d.data[k + 3] = 255; }
    g.putImageData(d, 0, 0); $('#grain').style.backgroundImage = `url(${c.toDataURL()})`;
  }

  // ---------- go ----------
  stage.compile();
  stage.start();
  window.__meza = {
    stage, get exp() { return exp; }, get org() { return org; }, go, openCart, plates,
    jump: y => (lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y)),
    labelY: name => exp.st.start + (exp.st.end - exp.st.start) * (exp.tl.labels[name] ?? name) / exp.tl.duration(),
    timeY: t => exp.st.start + (exp.st.end - exp.st.start) * t / exp.tl.duration(),
  };
  await frame(); await frame();
  window.__mezaReady = true;

  // progressive loading: next bottles, next worlds, fly-throughs — in scroll order, when idle
  const queue = [() => stage.ensureFx(0)];
  for (let i = 1; i < 5; i++) {
    queue.push(() => loadWorld(i));
    if (i < 4) queue.push(() => stage.ensureBottle(i));
    if (!Q.keepWorlds) queue.push(() => stage.forest.ensure(i)); // phones build worlds just ahead of the camera instead
    queue.push(() => stage.ensureFx(i));
  }
  const pump = async () => { const job = queue.shift(); if (!job) return; await job(); idle(pump); };
  setTimeout(() => idle(pump), 1200);

  loader.finish(() => {
    const el = $('#loader');
    if (RM) { gsap.to(el, { autoAlpha: 0, duration: 0.4, onComplete: () => el.remove() }); return; }
    Object.assign(I, { y: -0.7, ry: 1.6, camZ: 1.4 });
    gsap.timeline({ onComplete: () => lenis && lenis.start() })
      .to(el, { yPercent: -100, duration: 1.0, ease: 'expo.inOut', onComplete: () => el.remove() }, 0)
      .from('#wordmark span', { yPercent: 70, autoAlpha: 0, duration: 1.1, stagger: 0.07, ease: 'expo.out' }, 0.45)
      .to(I, { y: 0, ry: 0, camZ: 0, duration: 2.0, ease: 'expo.out' }, 0.35)
      .from('#p-hero, #p-meta, #p-cue, .nav', { opacity: 0, duration: 0.9, stagger: 0.08, ease: 'power2.out' }, 1.1);
  });
}

function frame() { return new Promise(r => requestAnimationFrame(() => r())); }
function idle(fn) { (window.requestIdleCallback || (f => setTimeout(f, 60)))(() => fn(), { timeout: 500 }); }

// If anything fails, say so on screen (with the reason) instead of leaving the loader spinning.
const showError = err => loader.fail('Meža could not start: ' + (err?.message || err || 'unknown error') + '. Reload the page, or open it in Chrome or Safari.');
addEventListener('error', e => { if (!window.__mezaReady) showError(e.error || e.message); });
addEventListener('unhandledrejection', e => { if (!window.__mezaReady) showError(e.reason); });
setTimeout(() => { if (!window.__mezaReady) showError('the 3D scene took too long to load'); }, 25000);
boot().catch(err => { console.error(err); showError(err); });
