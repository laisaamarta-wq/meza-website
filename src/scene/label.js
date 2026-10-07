import * as THREE from 'three';
import { rng, TAU } from './paint.js';

// Fonts are self-hosted (fontsource) so the labels render identically offline.
export const DISP = '"Bricolage Grotesque Variable", "Arial Narrow", sans-serif';
export const BODY = '"Instrument Sans Variable", Arial, sans-serif';
export const MONO = '"IBM Plex Mono", Menlo, monospace';

// label geometry constants (world units from the bottle base)
export const R = 0.364;
export const LABEL_Y0 = 0.3, LABEL_H = 0.95;
export const LBL = TAU * 0.86;
export const REG = { nutrition: 0.1025, botanical: 0.29, front: 0.5, side: 0.71, batch: 0.9 };
export const SUGAR_PY = 300, BOT_PY = 470;
export const pyToY = py => LABEL_Y0 + LABEL_H * (1 - py / 1024);
export const faceRot = u => LBL / 2 - u * LBL;

function setFont(g, f, stretch) { g.font = f; if ('fontStretch' in g) g.fontStretch = stretch || 'normal'; }
function fit(g, str, x, y, f, maxW, align = 'center', stretch) {
  setFont(g, f, stretch); g.textAlign = align;
  const w = g.measureText(str).width, s = Math.min(1, maxW / w);
  g.save(); g.translate(x, y); g.scale(s, 1); g.fillText(str, 0, 0); g.restore();
}
const spaced = (g, px) => { if ('letterSpacing' in g) g.letterSpacing = px + 'px'; };

function engraving(g, kind, cx, top, bot, ink, r) {
  g.save(); g.strokeStyle = ink; g.fillStyle = ink; g.lineCap = 'round'; g.lineJoin = 'round';
  const stem = [];
  for (let t = 0; t <= 1.0001; t += 0.02) stem.push([cx - 26 + 52 * t + Math.sin(t * 3.2) * 26, bot - (bot - top) * t]);
  const at = t => stem[Math.min(stem.length - 1, Math.round(t * (stem.length - 1)))];
  const poly = (pts, w) => { g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  const leaf = (x, y, a, len, w) => {
    g.save(); g.translate(x, y); g.rotate(a);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.45, -w, len, 0); g.quadraticCurveTo(len * 0.45, w, 0, 0);
    g.globalAlpha = 0.16; g.fill(); g.globalAlpha = 1; g.lineWidth = 2.6; g.stroke();
    g.lineWidth = 1.4; g.beginPath(); g.moveTo(4, 0); g.lineTo(len * 0.92, 0); g.stroke(); g.restore();
  };
  const dot = (x, y, rr, solid) => {
    g.beginPath(); g.arc(x, y, rr, 0, TAU); g.globalAlpha = solid ? 0.88 : 0.22; g.fill(); g.globalAlpha = 1; g.lineWidth = 2.2; g.stroke();
    g.save(); g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(x - rr * 0.35, y - rr * 0.35, rr * 0.22, 0, TAU); g.fill(); g.restore();
  };
  const lobed = (x, y, a, s) => {
    g.save(); g.translate(x, y); g.rotate(a); g.beginPath();
    for (let k = 0; k <= 72; k++) {
      const th = -Math.PI * 0.95 + (k / 72) * Math.PI * 1.9;
      const rad = s * (0.55 + 0.45 * Math.abs(Math.cos(th * 1.5))) * (0.92 + 0.08 * Math.sin(k * 1.7));
      const px = Math.cos(th - Math.PI / 2) * rad, py = Math.sin(th - Math.PI / 2) * rad - s * 0.9;
      k ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath(); g.globalAlpha = 0.16; g.fill(); g.globalAlpha = 1; g.lineWidth = 2.6; g.stroke();
    g.lineWidth = 1.4; for (const d of [-0.9, 0, 0.9]) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(d) * s * 0.85, -s * 0.9 - Math.cos(d) * s * 0.75); g.stroke(); }
    g.restore();
  };
  if (kind === 'buckthorn') {
    poly(stem, 5); let side = 1;
    for (let t = 0.06; t < 0.97; t += 0.052) { const [x, y] = at(t); side *= -1; leaf(x, y, (side > 0 ? -0.55 : Math.PI + 0.55) + (r() - 0.5) * 0.3, 118 + r() * 46, 11 + r() * 4); }
    for (let t = 0.22; t < 0.72; t += 0.035) { const [x, y] = at(t); for (let k = 0; k < 2; k++) dot(x + (r() - 0.5) * 50, y + (r() - 0.5) * 16, 10 + r() * 4, true); }
  } else if (kind === 'currant') {
    poly(stem, 5);
    [[0.22, -1], [0.48, 1], [0.74, -1]].forEach(([t, s]) => { const [x, y] = at(t), ex = x + s * 70, ey = y - 50; poly([[x, y], [ex, ey]], 3); lobed(ex, ey, s * 0.55, 84 + r() * 18); });
    const [rx, ry] = at(0.6), rac = [[rx, ry]]; for (let k = 1; k <= 7; k++) rac.push([rx - 30 - k * 9, ry + k * 26]);
    poly(rac, 2.4); rac.slice(1).forEach(([x, y], k) => dot(x - 14, y + 6, 13 - k * 0.6, true));
  } else if (kind === 'juniper') {
    poly(stem, 4.5);
    for (let t = 0.08; t < 0.96; t += 0.075) {
      const [x, y] = at(t), s = Math.round(t * 100) % 2 ? 1 : -1, len = 70 + r() * 40, tx = x + s * len, ty = y - len * 0.55;
      poly([[x, y], [tx, ty]], 2.6);
      for (let k = 0.15; k <= 1; k += 0.14) { const nx = x + (tx - x) * k, ny = y + (ty - y) * k; g.lineWidth = 1.6; for (const d of [-1, 1]) { g.beginPath(); g.moveTo(nx, ny); g.lineTo(nx + d * 10 + s * 14, ny - 22); g.stroke(); } }
      if (r() < 0.75) dot(tx + s * 10, ty + 16, 13, false);
    }
  } else {
    const s2 = stem.map(([x, y]) => [x + 34 + (bot - y) * 0.06, y]);
    poly(stem.slice(0, 40), 13); poly(s2.slice(0, 34), 11);
    g.lineWidth = 2.5; g.beginPath(); const [lx, ly] = at(0.78);
    for (let k = 0; k <= 80; k++) { const th = (k / 80) * TAU, rad = 120 * (0.8 + 0.2 * Math.sin(th * 9)) * (0.85 + 0.15 * Math.sin(th * 2.3)); const px = lx + Math.cos(th) * rad * 1.1, py = ly - 40 + Math.sin(th) * rad * 0.8; k ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.closePath(); g.globalAlpha = 0.14; g.fill(); g.globalAlpha = 1; g.stroke();
    [[0.18, 70], [0.3, 92], [0.42, 64], [0.26, 120]].forEach(([t, dx]) => { const [x, y] = at(t); g.save(); g.translate(x + dx, y); g.rotate(0.3); g.beginPath(); g.ellipse(0, 0, 17, 24, 0, 0, TAU); g.globalAlpha = 0.85; g.fill(); g.globalAlpha = 1; g.lineWidth = 2; g.stroke(); g.restore(); });
  }
  g.restore();
}

export function makeLabelTexture(v, i, W, maxAniso) {
  const c = document.createElement('canvas'); c.width = W; c.height = W / 2;
  const g = c.getContext('2d'); g.scale(W / 2048, W / 2048);
  const H = 1024, r = rng(11 + i * 97);
  g.fillStyle = v.paper; g.fillRect(0, 0, 2048, H);
  for (let n = 0; n < 3400; n++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.035)' : 'rgba(255,255,255,.05)'; g.fillRect(r() * 2048, r() * H, 1 + r() * 4, 1); }
  // a faint damp edge where condensation has soaked into the paper
  const dg = g.createLinearGradient(0, H - 120, 0, H); dg.addColorStop(0, 'rgba(60,40,20,0)'); dg.addColorStop(1, 'rgba(60,40,20,.10)');
  g.fillStyle = dg; g.fillRect(0, H - 120, 2048, 120);
  g.fillStyle = v.ink; g.strokeStyle = v.ink; g.textBaseline = 'alphabetic';
  const rule = (x1, y1, x2, y2, w) => { g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
  rule(0, 44, 2048, 44, 4); rule(0, 58, 2048, 58, 1.5); rule(0, H - 44, 2048, H - 44, 4); rule(0, H - 58, 2048, H - 58, 1.5);
  g.setLineDash([2, 8]); [410, 778, 1270, 1638].forEach(x => rule(x, 96, x, H - 96, 2)); g.setLineDash([]);

  spaced(g, 7); fit(g, 'SPARKLING BOTANICAL SODA', 1024, 140, `500 25px ${MONO}`, 440);
  spaced(g, -4); fit(g, 'MEŽA', 1024, 440, `800 300px ${DISP}`, 440, 'center', 'condensed');
  spaced(g, 0); rule(870, 488, 1178, 488, 2);
  fit(g, 'Nº ' + v.no, 1024, 640, `400 132px ${DISP}`, 420, 'center', 'condensed');
  fit(g, v.label[0], 1024, 762, `700 58px ${DISP}`, 440, 'center', 'condensed');
  spaced(g, 2); fit(g, v.label[1], 1024, 812, `600 34px ${DISP}`, 440, 'center', 'condensed');
  spaced(g, 5); fit(g, '330 ML · 0% ALC · SIGULDA, LV', 1024, 930, `500 21px ${MONO}`, 440); spaced(g, 0);

  engraving(g, v.key, 594, 120, 820, v.ink, r);
  fit(g, v.latin, 594, 892, `italic 400 27px ${BODY}`, 330);
  spaced(g, 4); fit(g, 'FORAGED · GAUJA VALLEY', 594, 934, `500 17px ${MONO}`, 330); spaced(g, 0);

  g.save(); g.translate(1430, 512); g.rotate(-Math.PI / 2);
  spaced(g, -2); fit(g, v.side, 0, 40, `800 132px ${DISP}`, 820, 'center', 'condensed');
  spaced(g, 8); fit(g, v.notes, 0, 104, `500 24px ${MONO}`, 820); spaced(g, 0); g.restore();
  g.save(); g.translate(1590, 512); g.rotate(-Math.PI / 2); spaced(g, 6); fit(g, 'BREWED WITH FORAGED BOTANICALS', 0, 0, `500 16px ${MONO}`, 820); spaced(g, 0); g.restore();

  spaced(g, 6); setFont(g, `500 24px ${MONO}`); g.textAlign = 'left'; g.fillText('PER 100 ML', 56, 150); spaced(g, 0);
  rule(56, 172, 362, 172, 2);
  const rows = [['Energy', v.kcal + ' kcal'], ['Sugars', v.sugar + ' g'], v.row3, ['Caffeine', '0 mg'], ['Salt', '0.01 g']];
  rows.forEach(([k, val], n) => {
    const y = 236 + n * 64;
    if (n === 1) {
      g.fillRect(44, y - 46, 330, 66); g.fillStyle = v.paper; setFont(g, `700 40px ${BODY}`);
      g.textAlign = 'left'; g.fillText(k, 58, y); g.textAlign = 'right'; g.fillText(val, 360, y); g.fillStyle = v.ink;
    } else {
      setFont(g, `500 29px ${BODY}`); g.textAlign = 'left'; g.fillText(k, 56, y); g.textAlign = 'right'; g.fillText(val, 362, y);
      g.setLineDash([1, 7]); rule(56, y + 16, 362, y + 16, 1.5); g.setLineDash([]);
    }
  });
  spaced(g, 4); setFont(g, `500 18px ${MONO}`); g.textAlign = 'left'; g.fillText('INGREDIENTS', 56, 610); spaced(g, 0);
  setFont(g, `400 23px ${BODY}`);
  let line = '', ly = 650;
  for (const w of v.ingr.split(' ')) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > 306) { g.fillText(line, 56, ly); line = w; ly += 32; } else line = t; }
  g.fillText(line, 56, ly);

  const bx = 1843; g.textAlign = 'center';
  spaced(g, 5); fit(g, 'BOTTLED AT THE SPRING', bx, 146, `500 20px ${MONO}`, 340); spaced(g, 0);
  fit(g, 'Sigulda, Gauja valley', bx, 196, `600 30px ${BODY}`, 340);
  fit(g, 'Latvia', bx, 236, `400 28px ${BODY}`, 340);
  rule(1700, 272, 1986, 272, 1.5);
  spaced(g, 6); fit(g, 'BATCH', bx, 320, `500 18px ${MONO}`, 340); spaced(g, 0);
  fit(g, 'SIG-24/09', bx, 392, `700 66px ${DISP}`, 340, 'center', 'condensed');
  spaced(g, 3); fit(g, 'BEST BEFORE 09·2027', bx, 440, `500 19px ${MONO}`, 340); spaced(g, 0);
  g.lineWidth = 5; g.beginPath(); g.arc(bx, 552, 56, 0, TAU); g.stroke();
  fit(g, 'D', bx, 576, `800 70px ${DISP}`, 100, 'center', 'condensed');
  spaced(g, 3); fit(g, 'DEPOZĪTS 0,10 €', bx, 652, `500 20px ${MONO}`, 340); spaced(g, 0);
  let x = 1712; while (x < 1974) { const w = 2 + Math.floor(r() * 4) * 2; if (r() > 0.35) g.fillRect(x, 700, w, 150); x += w + 2 + Math.floor(r() * 3) * 2; }
  spaced(g, 4); fit(g, '4 750312 24' + v.no + '96', bx, 888, `500 21px ${MONO}`, 300); spaced(g, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso;
  return tex;
}

export function makeCapTexture(v) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = v.cap; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.fillStyle = 'rgba(255,255,255,.85)';
  g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 104, 0, TAU); g.stroke();
  g.lineWidth = 1.5; g.beginPath(); g.arc(128, 128, 94, 0, TAU); g.stroke();
  fit(g, 'MEŽA', 128, 132, `800 62px ${DISP}`, 150, 'center', 'condensed');
  spaced(g, 2); fit(g, 'SIG-24/09', 128, 170, `500 17px ${MONO}`, 130); spaced(g, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
