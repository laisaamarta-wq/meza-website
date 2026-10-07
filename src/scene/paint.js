// 2D painting primitives for the forest worlds and ingredient plates.
// Everything is drawn in muted, backlit tones and then softened by depth blur,
// so the result reads as photographed atmosphere, not as vector illustration.

export const TAU = Math.PI * 2;

export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return [c, c.getContext('2d')];
}

// ---------- colour helpers ----------
export const rgb = hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const clamp255 = v => Math.max(0, Math.min(255, Math.round(v)));
const toHex = a => '#' + a.map(v => clamp255(v).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return toHex(A.map((x, i) => x + (B[i] - x) * t)); };
export const shade = (hex, k) => toHex(rgb(hex).map(v => v * k));
export const lift = (hex, k) => mix(hex, '#ffffff', k);
export const rgba = (hex, a) => { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; };

// ---------- light & air ----------
export function bokeh(g, x, y, r, col, a, hard = 0.5) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(col, a * (1 - hard * 0.4)));
  gr.addColorStop(Math.max(0.05, 0.92 - (1 - hard) * 0.6), rgba(col, a));
  gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}

export function glow(g, x, y, r, col, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(col, a)); gr.addColorStop(0.4, rgba(col, a * 0.35)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}

export function mist(g, W, y, h, col, a) {
  const gr = g.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.5, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.fillRect(0, y - h / 2, W, h);
}

export function grain(g, W, H, r, amount = 0.05, n = 0) {
  const count = n || Math.round(W * H / 420);
  for (let i = 0; i < count; i++) {
    g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${amount})` : `rgba(255,255,255,${amount * 0.7})`;
    g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2);
  }
}

// ---------- stems & leaves ----------
export function taperStroke(g, pts, w0, w1, fill) {
  if (pts.length < 2) return;
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    const [px, py] = pts[Math.max(0, i - 1)], [nx, ny] = pts[Math.min(pts.length - 1, i + 1)];
    let dx = nx - px, dy = ny - py; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const w = (w0 + (w1 - w0) * (i / (pts.length - 1))) / 2;
    L.push([x - dy * w, y + dx * w]); R.push([x + dy * w, y - dx * w]);
  }
  g.fillStyle = fill; g.beginPath();
  L.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
  for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
  g.closePath(); g.fill();
}

export function curve(x0, y0, x1, y1, bend, n = 24, wobble = 0, r = Math.random) {
  const pts = [], mx = (x0 + x1) / 2 - (y1 - y0) * bend, my = (y0 + y1) / 2 + (x1 - x0) * bend;
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
    pts.push([a * x0 + b * mx + c * x1 + (r() - 0.5) * wobble, a * y0 + b * my + c * y1 + (r() - 0.5) * wobble]);
  }
  return pts;
}

// narrow willow-like leaf (sea buckthorn): silver underside, olive top
export function lanceLeaf(g, x, y, ang, len, wid, top, under, light = 0.35) {
  g.save(); g.translate(x, y); g.rotate(ang);
  const gr = g.createLinearGradient(0, -wid, 0, wid);
  gr.addColorStop(0, lift(top, light * 0.5)); gr.addColorStop(0.5, top); gr.addColorStop(1, under);
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0);
  g.quadraticCurveTo(len * 0.45, -wid, len, 0); g.quadraticCurveTo(len * 0.5, wid * 0.9, 0, 0); g.fill();
  g.strokeStyle = rgba(lift(under, 0.3), 0.5); g.lineWidth = Math.max(0.6, wid * 0.12);
  g.beginPath(); g.moveTo(len * 0.04, 0); g.lineTo(len * 0.9, 0); g.stroke();
  g.restore();
}

// broad leaf with serrated lobes (blackcurrant, rose, bog myrtle when lobes = 0)
export function broadLeaf(g, x, y, ang, size, col, opts = {}) {
  const { lobes = 3, serr = 0.05, light = 0.4, veins = true, dew = 0, r = Math.random, wrinkle = 0 } = opts;
  g.save(); g.translate(x, y); g.rotate(ang);
  const path = new Path2D(), N = 120;
  for (let k = 0; k <= N; k++) {
    const th = (k / N) * TAU;
    const n = 1 + Math.sin(k * 7.3) * serr;
    let px, py;
    if (lobes) {
      const rad = (0.62 + 0.38 * Math.pow(Math.abs(Math.cos(th * lobes / 2)), 0.8)) * n;
      px = Math.cos(th) * rad * size; py = Math.sin(th) * rad * size;
    } else { // simple pointed oval lying along +x, base at the origin
      px = size * 0.9 + Math.cos(th) * size * 0.9 * n;
      py = Math.sin(th) * size * 0.4 * (1 - 0.35 * Math.cos(th)) * n;
    }
    k ? path.lineTo(px, py) : path.moveTo(px, py);
  }
  path.closePath();
  const ox = lobes ? 0 : size * 0.9;
  const gr = g.createRadialGradient(ox - size * 0.3, -size * 0.3, size * 0.1, ox, 0, size * 1.2);
  gr.addColorStop(0, lift(col, light)); gr.addColorStop(0.55, col); gr.addColorStop(1, shade(col, 0.55));
  g.fillStyle = gr; g.fill(path);
  if (veins) {
    g.save(); g.clip(path);
    g.strokeStyle = rgba(lift(col, 0.35), 0.35); g.lineWidth = Math.max(0.7, size * 0.025);
    const vc = lobes ? lobes + 2 : 7;
    for (let k = 0; k < vc; k++) {
      const a = lobes ? (k / vc) * TAU : (k - 3) * 0.35;
      g.beginPath();
      if (lobes) { g.moveTo(0, 0); g.quadraticCurveTo(Math.cos(a + 0.2) * size * 0.5, Math.sin(a + 0.2) * size * 0.5, Math.cos(a) * size * 0.95, Math.sin(a) * size * 0.95); }
      else { const bx = size * (0.2 + (k + 0.5) / vc * 1.4); g.moveTo(bx, 0); g.lineTo(bx + size * 0.25, Math.sign(a || 1) * size * 0.4); }
      g.stroke();
    }
    if (!lobes) { g.lineWidth = Math.max(1, size * 0.035); g.beginPath(); g.moveTo(0, 0); g.lineTo(size * 1.8, 0); g.stroke(); }
    if (wrinkle) { g.strokeStyle = rgba(shade(col, 0.6), 0.35 * wrinkle); for (let k = 0; k < 40; k++) { const wx = (r() - 0.3) * size * 2, wy = (r() - 0.5) * size; g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx + size * 0.15, wy + (r() - 0.5) * size * 0.1); g.stroke(); } }
    g.restore();
  }
  for (let k = 0; k < dew; k++) {
    const dx = (r() - 0.5) * size * (lobes ? 1.2 : 2) + (lobes ? 0 : size * 0.9), dy = (r() - 0.5) * size * 0.8, dr = size * (0.025 + r() * 0.05);
    droplet(g, dx, dy, dr);
  }
  g.restore();
}

export function droplet(g, x, y, r) {
  const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.05, x, y, r);
  gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.25, 'rgba(255,255,255,.25)');
  gr.addColorStop(0.8, 'rgba(0,0,0,.18)'); gr.addColorStop(1, 'rgba(255,255,255,.35)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}

// ---------- fruit ----------
// glossy, backlit berry: dark rim, glowing core, tight specular
export function berry(g, x, y, rad, base, opts = {}) {
  const { glowCol = lift(base, 0.5), spec = 0.9, bloom = 0, calyx = null, oval = 1, rot = 0, backlit = 0.55 } = opts;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, oval);
  const gr = g.createRadialGradient(-rad * 0.22, -rad * 0.25, rad * 0.05, 0, 0, rad);
  gr.addColorStop(0, lift(base, 0.32)); gr.addColorStop(0.5, base); gr.addColorStop(0.86, shade(base, 0.5)); gr.addColorStop(1, shade(base, 0.32));
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rad, 0, TAU); g.fill();
  if (backlit) {
    const tg = g.createRadialGradient(rad * 0.22, rad * 0.3, 0, rad * 0.22, rad * 0.3, rad * 0.75);
    tg.addColorStop(0, rgba(glowCol, backlit)); tg.addColorStop(1, rgba(glowCol, 0));
    g.fillStyle = tg; g.beginPath(); g.arc(0, 0, rad, 0, TAU); g.fill();
  }
  if (bloom) {
    g.fillStyle = `rgba(205,222,236,${0.32 * bloom})`; g.beginPath(); g.arc(0, 0, rad, 0, TAU); g.fill();
    const r = rng(Math.round(x * 13 + y * 7));
    for (let i = 0; i < 40; i++) { const a = r() * TAU, d = Math.sqrt(r()) * rad * 0.95; g.fillStyle = `rgba(230,240,248,${0.25 * bloom})`; g.fillRect(Math.cos(a) * d, Math.sin(a) * d, rad * 0.06, rad * 0.06); }
  }
  if (spec) {
    g.fillStyle = `rgba(255,255,255,${spec})`;
    g.beginPath(); g.ellipse(-rad * 0.36, -rad * 0.4, rad * 0.2, rad * 0.12, -0.6, 0, TAU); g.fill();
    g.fillStyle = `rgba(255,255,255,${spec * 0.25})`;
    g.beginPath(); g.ellipse(rad * 0.3, rad * 0.42, rad * 0.22, rad * 0.08, -0.6, 0, TAU); g.fill();
  }
  if (calyx === 'star') {
    g.strokeStyle = rgba(shade(base, 0.25), 0.9); g.lineWidth = Math.max(0.8, rad * 0.08);
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; g.beginPath(); g.moveTo(rad * 0.05 * Math.cos(a), rad * 0.62 + rad * 0.05 * Math.sin(a)); g.lineTo(rad * 0.22 * Math.cos(a), rad * 0.62 + rad * 0.18 * Math.sin(a)); g.stroke(); }
  } else if (calyx === 'crown') {
    g.strokeStyle = rgba('#3a2a14', 0.9); g.lineWidth = Math.max(0.8, rad * 0.1);
    for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(k * rad * 0.08, rad * 0.9); g.quadraticCurveTo(k * rad * 0.3, rad * 1.25, k * rad * 0.45, rad * 1.45); g.stroke(); }
  } else if (calyx === 'dot') {
    g.fillStyle = rgba(shade(base, 0.25), 0.8); g.beginPath(); g.arc(0, -rad * 0.82, rad * 0.1, 0, TAU); g.fill();
  }
  g.restore();
}

// five-petal wild rose (Rosa rugosa)
export function rose(g, x, y, rad, col, r, open = 1) {
  g.save(); g.translate(x, y); g.rotate(r() * TAU);
  for (let k = 0; k < 5; k++) {
    g.save(); g.rotate(k / 5 * TAU + (r() - 0.5) * 0.2);
    const pr = rad * (0.55 + r() * 0.1) * open;
    const gr = g.createRadialGradient(0, -pr * 0.3, pr * 0.1, 0, -pr * 0.8, pr * 1.1);
    gr.addColorStop(0, lift(col, 0.4)); gr.addColorStop(0.6, col); gr.addColorStop(1, shade(col, 0.6));
    g.fillStyle = gr; g.beginPath();
    g.moveTo(0, 0); g.bezierCurveTo(-pr * 0.9, -pr * 0.4, -pr * 0.8, -pr * 1.35, 0, -pr * 1.15);
    g.bezierCurveTo(pr * 0.8, -pr * 1.35, pr * 0.9, -pr * 0.4, 0, 0); g.fill();
    g.restore();
  }
  glow(g, 0, 0, rad * 0.45, '#ffe28a', 0.7);
  for (let k = 0; k < 26; k++) { const a = r() * TAU, d = rad * (0.08 + r() * 0.2); g.fillStyle = r() < 0.5 ? '#f3c443' : '#c98f22'; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, rad * 0.035, 0, TAU); g.fill(); }
  g.restore();
}

// meadow flowers: yarrow umbels, tansy buttons, cornflowers
export function umbel(g, x, y, rad, col, r) {
  for (let k = 0; k < 34; k++) { const a = r() * TAU, d = Math.sqrt(r()) * rad; berry(g, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.5, rad * 0.12, col, { spec: 0.2, backlit: 0.2 }); }
}
export function tansy(g, x, y, rad, r) {
  for (let k = 0; k < 7; k++) { const a = r() * TAU, d = r() * rad; berry(g, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.4, rad * 0.22, '#d9a21b', { spec: 0.25, backlit: 0.4, glowCol: '#ffe08a' }); }
}

// ---------- grasses ----------
export function grass(g, x, y, h, n, col, r, lean = 0, lightCol = null) {
  for (let i = 0; i < n; i++) {
    const bx = x + (r() - 0.5) * h * 0.35, hh = h * (0.5 + r() * 0.6), l = lean + (r() - 0.5) * 0.7;
    const tx = bx + Math.sin(l) * hh, ty = y - Math.cos(l) * hh * 0.95;
    const pts = curve(bx, y, tx, ty, (r() - 0.5) * 0.25, 10);
    taperStroke(g, pts, Math.max(1, h * 0.012), 0.2, rgba(r() < 0.3 && lightCol ? lightCol : col, 0.55 + r() * 0.4));
  }
}

// ---------- trees ----------
// Scots pine: tall orange-barked trunk, crown high up
export function pine(g, x, yBase, yTop, w, cols, r, lightSide = 1) {
  const { dark, mid, rim, crown } = cols;
  const pts = curve(x, yBase, x + (r() - 0.5) * w * 2, yTop, (r() - 0.5) * 0.04, 30, w * 0.06, r);
  // trunk body with a cross gradient so it reads round
  g.save();
  const gr = g.createLinearGradient(x - w, 0, x + w, 0);
  if (lightSide > 0) { gr.addColorStop(0, dark); gr.addColorStop(0.55, mid); gr.addColorStop(0.92, rim); gr.addColorStop(1, dark); }
  else { gr.addColorStop(0, dark); gr.addColorStop(0.08, rim); gr.addColorStop(0.45, mid); gr.addColorStop(1, dark); }
  taperStroke(g, pts, w, w * 0.45, gr);
  // bark plates in the lower half
  for (let i = 0; i < 26; i++) {
    const t = r() * 0.6, p = pts[Math.round(t * (pts.length - 1))];
    g.fillStyle = rgba(dark, 0.35 + r() * 0.3); g.fillRect(p[0] - w * 0.45 + r() * w * 0.4, p[1], w * (0.2 + r() * 0.4), Math.max(1, w * 0.12));
  }
  g.restore();
  // crown: clumps of needles in the top third
  const top = pts[pts.length - 1];
  const crownH = (yBase - yTop) * (0.22 + r() * 0.12);
  for (let i = 0; i < 14; i++) {
    const cy = top[1] + r() * crownH, cx = top[0] + (r() - 0.5) * w * 18 * (1 - (cy - top[1]) / crownH * 0.4);
    // branch
    g.strokeStyle = rgba(dark, 0.8); g.lineWidth = Math.max(1, w * 0.15);
    g.beginPath(); g.moveTo(top[0], cy + crownH * 0.08); g.quadraticCurveTo((top[0] + cx) / 2, cy, cx, cy - crownH * 0.04); g.stroke();
    const cw = w * (3 + r() * 4), ch = cw * 0.45;
    const cg = g.createRadialGradient(cx - cw * 0.2 * lightSide, cy - ch * 0.4, 0, cx, cy, cw);
    cg.addColorStop(0, rgba(crown.light, 0.55)); cg.addColorStop(0.6, rgba(crown.base, 0.8)); cg.addColorStop(1, rgba(crown.base, 0));
    g.fillStyle = cg; g.beginPath(); g.ellipse(cx, cy, cw, ch, (r() - 0.5) * 0.4, 0, TAU); g.fill();
  }
}

export function birch(g, x, yBase, yTop, w, r, cols) {
  const { bark = '#d9d6cc', dark = '#1b1e1a', fog = null } = cols || {};
  const pts = curve(x, yBase, x + (r() - 0.5) * w * 3, yTop, (r() - 0.5) * 0.05, 30, w * 0.04, r);
  const gr = g.createLinearGradient(x - w, 0, x + w, 0);
  gr.addColorStop(0, shade(bark, 0.45)); gr.addColorStop(0.35, bark); gr.addColorStop(0.7, shade(bark, 0.8)); gr.addColorStop(1, shade(bark, 0.35));
  taperStroke(g, pts, w, w * 0.5, gr);
  for (let i = 0; i < 46; i++) {
    const t = r(), p = pts[Math.round(t * (pts.length - 1))], ww = w * (1 - t * 0.5);
    g.fillStyle = rgba(dark, 0.55 + r() * 0.4);
    g.fillRect(p[0] - ww * 0.5 + r() * ww * 0.5, p[1], ww * (0.15 + r() * 0.45), Math.max(1, ww * (0.05 + r() * 0.08)));
  }
  const base = pts[0]; g.fillStyle = rgba(dark, 0.7); g.fillRect(base[0] - w * 0.55, base[1] - w * 2.5, w * 1.1, w * 2.5);
  if (fog) { g.fillStyle = rgba(fog.col, fog.a); taperStroke(g, pts, w * 1.02, w * 0.52, rgba(fog.col, fog.a)); }
}

export function spruce(g, x, yBase, h, w, col, r) {
  const tiers = 16;
  for (let k = 0; k < tiers; k++) {
    const t = k / (tiers - 1), y = yBase - h * (0.08 + t * 0.92), span = w * (1 - t) * (0.85 + r() * 0.3);
    g.fillStyle = rgba(col, 0.92);
    g.beginPath(); g.moveTo(x, y - h * 0.05);
    for (let j = 0; j <= 10; j++) { const s = j / 10; g.lineTo(x - span * s, y + h * 0.04 * s * s + (r() - 0.5) * h * 0.012); }
    g.lineTo(x + span, y + h * 0.04 + (r() - 0.5) * h * 0.01);
    for (let j = 10; j >= 0; j--) { const s = j / 10; g.lineTo(x + span * s, y + h * 0.04 * s * s + (r() - 0.5) * h * 0.012); }
    g.closePath(); g.fill();
  }
  g.fillStyle = rgba(col, 1); g.fillRect(x - w * 0.03, yBase - h * 0.1, w * 0.06, h * 0.1);
}

// stunted bog pine: crooked trunk, sparse irregular crown
export function bogPine(g, x, yBase, h, col, r) {
  const pts = curve(x, yBase, x + (r() - 0.5) * h * 0.25, yBase - h, (r() - 0.5) * 0.2, 18, h * 0.02, r);
  taperStroke(g, pts, h * 0.035, h * 0.012, col);
  for (let i = 0; i < 9; i++) {
    const p = pts[Math.round((0.35 + r() * 0.65) * (pts.length - 1))], s = (r() < 0.5 ? -1 : 1);
    const ex = p[0] + s * h * (0.08 + r() * 0.18), ey = p[1] - h * r() * 0.08;
    taperStroke(g, curve(p[0], p[1], ex, ey, 0.1, 6), h * 0.012, h * 0.004, col);
    g.fillStyle = rgba(col, 0.9); g.beginPath(); g.ellipse(ex, ey, h * (0.05 + r() * 0.05), h * (0.025 + r() * 0.02), 0, 0, TAU); g.fill();
  }
}

// ---------- ground & water ----------
export function ridge(g, W, yBase, amp, col, r, freq = 3, fillTo = null) {
  g.fillStyle = col; g.beginPath(); g.moveTo(0, fillTo ?? yBase + amp * 4);
  const ph = r() * 10;
  for (let x = 0; x <= W; x += W / 80) g.lineTo(x, yBase - Math.sin(x / W * freq * TAU + ph) * amp - Math.sin(x / W * 11 + ph) * amp * 0.25);
  g.lineTo(W, fillTo ?? yBase + amp * 4); g.closePath(); g.fill();
}

export function water(g, W, y0, H, sky, dark, r) {
  const gr = g.createLinearGradient(0, y0, 0, H);
  gr.addColorStop(0, sky); gr.addColorStop(0.35, mix(sky, dark, 0.6)); gr.addColorStop(1, dark);
  g.fillStyle = gr; g.fillRect(0, y0, W, H - y0);
  for (let i = 0; i < 220; i++) {
    const y = y0 + Math.pow(r(), 1.6) * (H - y0), len = W * (0.01 + r() * 0.08) * (1 + (y - y0) / (H - y0) * 2);
    g.fillStyle = `rgba(255,240,215,${0.03 + r() * 0.1 * (1 - (y - y0) / (H - y0))})`;
    g.fillRect(r() * W, y, len, Math.max(1, (y - y0) / (H - y0) * 3));
  }
}

// red Devonian sandstone of the Gauja valley: layered cliff face
export function sandstone(g, W, yTop, yBot, cols, r) {
  const { base, shadow, light } = cols;
  const top = [];
  for (let x = 0; x <= W; x += W / 60) top.push([x, yTop + Math.sin(x / W * 5 + 1.3) * (yBot - yTop) * 0.12 + (r() - 0.5) * (yBot - yTop) * 0.05]);
  const path = new Path2D(); path.moveTo(0, yBot); top.forEach(([x, y]) => path.lineTo(x, y)); path.lineTo(W, yBot); path.closePath();
  const gr = g.createLinearGradient(0, yTop, 0, yBot);
  gr.addColorStop(0, light); gr.addColorStop(0.5, base); gr.addColorStop(1, shadow);
  g.fillStyle = gr; g.fill(path);
  g.save(); g.clip(path);
  for (let i = 0; i < 70; i++) {
    const y = yTop + r() * (yBot - yTop);
    g.strokeStyle = rgba(r() < 0.5 ? shadow : light, 0.15 + r() * 0.25); g.lineWidth = 1 + r() * 3;
    g.beginPath(); const x0 = r() * W; g.moveTo(x0, y); g.bezierCurveTo(x0 + W * 0.1, y + (r() - 0.5) * 12, x0 + W * 0.2, y + (r() - 0.5) * 12, x0 + W * (0.2 + r() * 0.3), y + (r() - 0.5) * 8); g.stroke();
  }
  for (let i = 0; i < 9; i++) { // vertical erosion shadows
    const x = r() * W; const sg = g.createLinearGradient(x - 40, 0, x + 40, 0);
    sg.addColorStop(0, rgba(shadow, 0)); sg.addColorStop(0.5, rgba(shadow, 0.45)); sg.addColorStop(1, rgba(shadow, 0));
    g.fillStyle = sg; g.fillRect(x - 40, yTop, 80, yBot - yTop);
  }
  g.restore();
}

// ---------- plant compositions ----------
// a sea buckthorn branch: woody stem, silver lance leaves, dense clusters of berries
export function buckthornBranch(g, x0, y0, x1, y1, scale, r, cols, berryDensity = 1) {
  const { wood = '#3a2416', leaf = '#6f7a5a', under = '#a9b29a', berryCol = '#e8740c', glowCol = '#ffc061' } = cols || {};
  const main = curve(x0, y0, x1, y1, (r() - 0.5) * 0.3, 40, scale * 2, r);
  taperStroke(g, main, scale * 9, scale * 2.5, wood);
  const twigs = [];
  for (let i = 4; i < main.length - 2; i += 3) {
    const [px, py] = main[i], s = (i / 3) % 2 ? 1 : -1;
    const ang = Math.atan2(main[i + 1][1] - py, main[i + 1][0] - px) + s * (0.6 + r() * 0.5);
    const len = scale * (40 + r() * 60);
    const tw = curve(px, py, px + Math.cos(ang) * len, py + Math.sin(ang) * len, (r() - 0.5) * 0.3, 10);
    taperStroke(g, tw, scale * 3, scale * 1, wood); twigs.push(tw);
  }
  // berries first (they sit tight on the wood), leaves at twig ends
  for (const tw of [main, ...twigs]) {
    for (let k = 1; k < tw.length - 2; k++) {
      if (r() > 0.75 * berryDensity) continue;
      const [px, py] = tw[k];
      for (let j = 0; j < 2 + (r() * 2 | 0); j++)
        berry(g, px + (r() - 0.5) * scale * 14, py + (r() - 0.5) * scale * 12, scale * (5 + r() * 2.2), shade(berryCol, 0.85 + r() * 0.3), { glowCol, oval: 1.12, rot: r() * TAU, backlit: 0.6, calyx: 'dot' });
    }
  }
  for (const tw of twigs) {
    const end = tw[tw.length - 1], prev = tw[tw.length - 3];
    const base = Math.atan2(end[1] - prev[1], end[0] - prev[0]);
    for (let k = 0; k < 7; k++) lanceLeaf(g, end[0], end[1], base + (k - 3) * 0.32 + (r() - 0.5) * 0.2, scale * (34 + r() * 26), scale * (3.6 + r() * 1.4), leaf, under, 0.4);
  }
}

export function currantSprig(g, x0, y0, x1, y1, scale, r, cols) {
  const { wood = '#2c2418', leaf = '#2f5a2c', berryCol = '#1c1426', glowCol = '#6a4a8a' } = cols || {};
  const main = curve(x0, y0, x1, y1, (r() - 0.5) * 0.25, 30, scale, r);
  taperStroke(g, main, scale * 6, scale * 2, wood);
  for (let i = 5; i < main.length; i += 5) {
    const [px, py] = main[i], s = (i / 5) % 2 ? 1 : -1;
    const ang = s * (0.9 + r() * 0.4) - Math.PI / 2;
    const lx = px + Math.cos(ang) * scale * 40, ly = py + Math.sin(ang) * scale * 40;
    taperStroke(g, curve(px, py, lx, ly, 0.1, 6), scale * 2.2, scale * 1.2, wood);
    broadLeaf(g, lx, ly, ang + Math.PI / 2 + (r() - 0.5) * 0.4, scale * (36 + r() * 16), shade(leaf, 0.85 + r() * 0.3), { lobes: 3, serr: 0.06, dew: 5 + (r() * 5 | 0), r });
  }
  // a hanging raceme
  const k = Math.floor(main.length * 0.55), [hx, hy] = main[k];
  const rac = curve(hx, hy, hx - scale * 25, hy + scale * 120, 0.15, 12);
  taperStroke(g, rac, scale * 1.6, scale * 0.8, '#3a3020');
  rac.forEach(([x, y], i) => { if (i > 1 && i % 2 === 0) berry(g, x + scale * 6, y + scale * 6, scale * (8 - i * 0.2), berryCol, { glowCol, calyx: 'star', backlit: 0.35 }); });
}

export function juniperSprig(g, x0, y0, x1, y1, scale, r, cols) {
  const { wood = '#2a2218', needle = '#2c4a3c', light = '#7aa08c', berryCol = '#2a3e5e' } = cols || {};
  const main = curve(x0, y0, x1, y1, (r() - 0.5) * 0.3, 30, scale, r);
  taperStroke(g, main, scale * 5, scale * 1.5, wood);
  const twigs = [main];
  for (let i = 3; i < main.length - 2; i += 3) {
    const [px, py] = main[i], s = (i / 3) % 2 ? 1 : -1, len = scale * (30 + r() * 40);
    const a = Math.atan2(main[i + 1][1] - py, main[i + 1][0] - px) + s * 0.8;
    const tw = curve(px, py, px + Math.cos(a) * len, py + Math.sin(a) * len, 0.1, 8);
    taperStroke(g, tw, scale * 2, scale * 0.8, wood); twigs.push(tw);
  }
  for (const tw of twigs) for (let k = 0; k < tw.length; k++) {
    const [px, py] = tw[k];
    for (let j = 0; j < 3; j++) {
      const a = (j / 3) * TAU + k * 0.7, l = scale * (10 + r() * 5);
      g.strokeStyle = rgba(r() < 0.3 ? light : needle, 0.85); g.lineWidth = Math.max(0.8, scale * 1.4);
      g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l * 0.8 - l * 0.2); g.stroke();
    }
  }
  for (let i = 0; i < 9; i++) {
    const tw = twigs[(r() * twigs.length) | 0], p = tw[(r() * tw.length) | 0];
    berry(g, p[0] + (r() - 0.5) * scale * 10, p[1] + (r() - 0.5) * scale * 10, scale * (6 + r() * 2), shade(berryCol, 0.8 + r() * 0.4), { bloom: 1, spec: 0.35, backlit: 0.15, calyx: 'dot' });
  }
}

export function roseBranch(g, x0, y0, x1, y1, scale, r, cols) {
  const { wood = '#3a2620', leaf = '#2e4a2a', petal = '#d4567a', hip = '#d0391e' } = cols || {};
  const main = curve(x0, y0, x1, y1, (r() - 0.5) * 0.3, 30, scale, r);
  taperStroke(g, main, scale * 6, scale * 2, wood);
  for (let i = 0; i < main.length; i += 2) { const [px, py] = main[i]; g.strokeStyle = rgba('#5a3a30', 0.8); g.lineWidth = scale * 0.8; g.beginPath(); g.moveTo(px, py); g.lineTo(px + (r() - 0.5) * scale * 8, py - scale * 5); g.stroke(); }
  for (let i = 4; i < main.length - 1; i += 5) {
    const [px, py] = main[i], s = (i / 5) % 2 ? 1 : -1;
    for (let j = 0; j < 5; j++) broadLeaf(g, px, py, s * (0.5 + j * 0.35) - Math.PI / 2 + (r() - 0.5) * 0.3, scale * (13 + r() * 6), shade(leaf, 0.85 + r() * 0.3), { lobes: 0, serr: 0.04, wrinkle: 1, r });
  }
  const [fx, fy] = main[main.length - 1]; rose(g, fx, fy, scale * 40, petal, r);
  const [mx, my] = main[Math.floor(main.length * 0.5)];
  rose(g, mx + scale * 30, my - scale * 20, scale * 30, shade(petal, 0.9), r, 0.9);
  for (let j = 0; j < 3; j++) { const p = main[Math.floor(main.length * (0.2 + j * 0.15))]; berry(g, p[0] + scale * 12, p[1] + scale * 18, scale * 11, hip, { oval: 1.25, calyx: 'crown', glowCol: '#ff8a50', backlit: 0.5 }); }
}

export function rhubarbLeaf(g, x, y, size, ang, r, cols) {
  const { leaf = '#2a3e22', stalk = '#9a2a32' } = cols || {};
  const sx = x - Math.sin(ang) * size * 1.6, sy = y + Math.cos(ang) * size * 1.6;
  taperStroke(g, curve(sx, sy + size, x, y, 0.08, 16), size * 0.12, size * 0.08, stalk);
  g.save(); g.translate(x, y); g.rotate(ang);
  const path = new Path2D();
  for (let k = 0; k <= 160; k++) {
    const th = (k / 160) * TAU, rad = size * (0.85 + 0.12 * Math.sin(th * 13 + 1) + 0.05 * Math.sin(th * 31));
    const px = Math.cos(th) * rad * 1.1, py = Math.sin(th) * rad * 0.85 - size * 0.7;
    k ? path.lineTo(px, py) : path.moveTo(px, py);
  }
  path.closePath();
  const gr = g.createRadialGradient(-size * 0.3, -size * 1.1, size * 0.1, 0, -size * 0.7, size * 1.3);
  gr.addColorStop(0, lift(leaf, 0.3)); gr.addColorStop(0.6, leaf); gr.addColorStop(1, shade(leaf, 0.5));
  g.fillStyle = gr; g.fill(path);
  g.save(); g.clip(path); g.strokeStyle = rgba('#b0404a', 0.55); g.lineWidth = size * 0.03;
  for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.42; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(Math.cos(a) * size * 0.4, -size * 0.3 + Math.sin(a) * size * 0.4, Math.cos(a) * size * 1.1, -size * 0.7 + Math.sin(a) * size * 0.9); g.stroke(); }
  g.restore(); g.restore();
}

export function fern(g, x, y, len, ang, col, r) {
  const pts = curve(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len, 0.18, 28);
  taperStroke(g, pts, len * 0.012, len * 0.003, col);
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i], [nx, ny] = pts[i + 1], a = Math.atan2(ny - py, nx - px), l = len * 0.16 * Math.sin(i / pts.length * Math.PI);
    for (const s of [-1, 1]) lanceLeaf(g, px, py, a + s * 1.15, l, l * 0.16, col, shade(col, 0.7), 0.25);
  }
}

export function honeycomb(g, W, H, cell, r, cols) {
  const { wax = '#c98b20', honey = '#e9a21a', dark = '#3a1e05' } = cols || {};
  const hw = cell * Math.sqrt(3);
  for (let row = -1; row < H / (cell * 1.5) + 2; row++) {
    for (let col = -1; col < W / hw + 2; col++) {
      const cx = col * hw + (row % 2 ? hw / 2 : 0), cy = row * cell * 1.5;
      const p = new Path2D();
      for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; const px = cx + Math.cos(a) * cell * 0.94, py = cy + Math.sin(a) * cell * 0.94; k ? p.lineTo(px, py) : p.moveTo(px, py); }
      p.closePath();
      const filled = r() < 0.85;
      const gr = g.createRadialGradient(cx - cell * 0.25, cy - cell * 0.3, cell * 0.05, cx, cy, cell);
      if (filled) { gr.addColorStop(0, '#f6c860'); gr.addColorStop(0.3, honey); gr.addColorStop(1, shade(honey, 0.3)); }
      else { gr.addColorStop(0, shade(wax, 0.7)); gr.addColorStop(1, dark); }
      g.fillStyle = gr; g.fill(p);
      g.strokeStyle = rgba(wax, 0.9); g.lineWidth = cell * 0.1; g.stroke(p);
      if (filled && r() < 0.6) { g.fillStyle = 'rgba(255,240,200,.55)'; g.beginPath(); g.ellipse(cx - cell * 0.35, cy - cell * 0.38, cell * 0.14, cell * 0.06, -0.6, 0, TAU); g.fill(); }
    }
  }
}

// soft-focus copy of a canvas (depth of field)
// Large radii are blurred at reduced resolution and scaled back up: same look, a fraction of the cost.
export function blurred(src, px) {
  const [c, g] = canvas(src.width, src.height);
  if (!('filter' in g) || px < 0.5) { g.drawImage(src, 0, 0); return c; }
  const k = Math.max(1, Math.min(6, px / 2));
  if (k > 1.2) {
    const [s, gs] = canvas(src.width / k, src.height / k);
    gs.filter = `blur(${px / k}px)`; gs.drawImage(src, 0, 0, s.width, s.height);
    g.imageSmoothingQuality = 'high'; g.drawImage(s, 0, 0, c.width, c.height);
    release(s);
  } else { g.filter = `blur(${px}px)`; g.drawImage(src, 0, 0); g.filter = 'none'; }
  return c;
}

// Give a canvas's pixel memory back immediately (WebKit counts every live canvas against a hard cap).
export function release(c) { if (c && c.width) { c.width = 0; c.height = 0; } }
