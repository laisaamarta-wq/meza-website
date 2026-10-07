import { gsap } from 'gsap';
import * as P from '../scene/paint.js';
import { WORLD_IMG, loadImage } from '../data/images.js';

// The last frame: a pine forest at the edge of night, almost gone into darkness.
// Painted once, only when the footer comes near, at the footer's own size.
function paintForest(cnv, cut) {
  const box = cnv.getBoundingClientRect();
  const k = Math.min(1.25, devicePixelRatio || 1) * 0.75; // soft by design: no need for full resolution
  const W = Math.max(320, Math.round(box.width * k)), H = Math.max(320, Math.round(box.height * k));
  const portrait = H > W;
  const r = P.rng(2026);
  const [layer, g] = P.canvas(W, H);
  const s = Math.min(W, H) / 900 * (portrait ? 1.7 : 1);

  // horizon haze behind the trunks, the last of the light
  P.glow(g, W * 0.5, H * 0.66, Math.max(W, H) * 0.5, '#5a3414', 0.55);
  P.mist(g, W, H * 0.66, H * 0.26, '#3a2410', 0.6);
  // far pines
  for (let n = 0; n < (portrait ? 22 : 44); n++) {
    const x = r() * W;
    P.pine(g, x, H * (0.82 + r() * 0.04), H * (0.12 + r() * 0.1), W * (0.003 + r() * 0.003) * (portrait ? 1.8 : 1),
      { dark: '#0c0805', mid: '#1a110a', rim: '#3a2410', crown: { base: '#0a0705', light: '#22160c' } }, r, x < W / 2 ? 1 : -1);
  }
  P.mist(g, W, H * 0.8, H * 0.18, '#2a1a0c', 0.7);
  // near trunks at the edges, framing the name
  for (let n = 0; n < (portrait ? 3 : 6); n++) {
    const x = r() < 0.5 ? r() * W * 0.18 : W - r() * W * 0.18;
    P.pine(g, x, H * 1.05, -H * 0.1, W * (0.01 + r() * 0.008) * (portrait ? 1.8 : 1),
      { dark: '#070504', mid: '#120c07', rim: '#4a2c12', crown: { base: '#060504', light: '#140e08' } }, r, x < W / 2 ? 1 : -1);
  }
  // ground and grass
  P.ridge(g, W, H * 0.93, H * 0.015, '#080604', r, 1.5, H);
  for (let n = 0; n < 60; n++) P.grass(g, r() * W, H * (0.92 + r() * 0.08), H * (0.05 + r() * 0.06), 7, '#120c07', r, (r() - 0.5) * 0.5, '#3a2410');
  // sea buckthorn reaching in from the corners, its last berries barely lit
  // the same sea buckthorn branch that opened the site, now almost lost in the dark
  if (cut) {
    const place = (x, y, w, rot, flip) => {
      const h = w * cut.naturalHeight / cut.naturalWidth;
      g.save(); g.translate(x, y); g.rotate(rot); g.scale(flip ? -1 : 1, 1);
      if ('filter' in g) g.filter = 'brightness(.42) saturate(.85)';
      g.drawImage(cut, 0, -h, w, h); g.restore();
    };
    if (portrait) { place(-W * 0.1, H * 0.99, W * 0.62, -0.08, false); place(W * 1.08, H * 0.5, W * 0.55, 0.2, true); }
    else { place(-W * 0.05, H * 0.86, W * 0.3, -0.1, false); place(W * 1.04, H * 0.74, W * 0.27, 0.16, true); }
  }
  for (let n = 0; n < 18; n++) P.bokeh(g, r() * W, H * (0.45 + r() * 0.4), s * (6 + r() * 18), '#c07a30', 0.04 + r() * 0.06, 0.6);

  const soft = P.blurred(layer, Math.max(W, H) / 380);
  cnv.width = W; cnv.height = H;
  const out = cnv.getContext('2d');
  out.drawImage(soft, 0, 0);
  // fade into darkness: top to ink, a little grain over everything
  const fade = out.createLinearGradient(0, 0, 0, H);
  fade.addColorStop(0, 'rgba(12,9,6,1)'); fade.addColorStop(0.42, 'rgba(12,9,6,.55)'); fade.addColorStop(0.75, 'rgba(12,9,6,.1)'); fade.addColorStop(1, 'rgba(12,9,6,.35)');
  out.fillStyle = fade; out.fillRect(0, 0, W, H);
  P.grain(out, W, H, r, 0.035);
}

export function mountFooter({ RM }) {
  const foot = document.getElementById('foot');
  const cnv = document.getElementById('footForest');
  const mark = document.getElementById('footMark');
  const parts = foot.querySelectorAll('[data-foot]');
  if (!foot) return;

  let painted = false, lastW = 0;
  const paint = async () => { painted = true; const cut = await loadImage(WORLD_IMG[0].cut); paintForest(cnv, cut); lastW = innerWidth; requestAnimationFrame(() => cnv.classList.add('is-in')); };
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting) && !painted) paint(); }, { rootMargin: '100% 0px' });
  io.observe(foot);
  let t; addEventListener('resize', () => { if (!painted || Math.abs(innerWidth - lastW) < 40) return; clearTimeout(t); t = setTimeout(paint, 300); });

  if (RM) return; // reduced motion: everything simply rests in place

  // the experience settles: forest rises out of the dark, the name lifts into place, the last line arrives
  const tl = gsap.timeline({ scrollTrigger: { trigger: foot, start: 'top bottom', end: 'bottom bottom', scrub: 1.2 } });
  tl.fromTo(cnv, { yPercent: 10, scale: 1.08 }, { yPercent: 0, scale: 1, ease: 'none', duration: 1 }, 0)
    .fromTo(mark, { yPercent: 38, opacity: 0.35 }, { yPercent: 0, opacity: 1, ease: 'power1.out', duration: 0.9 }, 0.1)
    .fromTo('.foot-glow', { scale: 0.7, yPercent: 24 }, { scale: 1, yPercent: 0, ease: 'none', duration: 0.8 }, 0.1);
  parts.forEach((el, i) => tl.fromTo(el, { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, ease: 'power2.out', duration: 0.28 }, 0.22 + i * 0.09));
}
