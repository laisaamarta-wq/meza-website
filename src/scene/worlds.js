// Painted compositions for the five forest worlds.
// Each world returns a sky description and three depth layers (far, mid, near),
// painted at the stage aspect ratio and pre-blurred for depth of field.
// The middle of the frame is kept quiet: that is where the bottle stands.
import * as P from './paint.js';
import { worldReady } from '../data/images.js';

const { rng, canvas, blurred } = P;
// blur into a new canvas and free the sharp one
const blur = (c, px) => { const out = blurred(c, px); P.release(c); return out; };

export const WORLD_META = [
  { key: 'buckthorn', name: 'Dune forest, golden hour',
    sky: { top: '#070403', hor: '#4e280c', bot: '#0e0703', horY: 0.58, sun: [0.64, 0.5], sunCol: '#ff9e3c', sunSize: 0.3, haze: 0.2 },
    particle: '#ffcf80', shafts: 1.0 },
  { key: 'currant', name: 'Birch wood after rain',
    sky: { top: '#030806', hor: '#2a5236', bot: '#050d08', horY: 0.6, sun: [0.32, 0.28], sunCol: '#cfe8c0', sunSize: 0.32, haze: 0.18 },
    particle: '#dff2e4', shafts: 0.7 },
  { key: 'juniper', name: 'Raised bog, blue hour',
    sky: { top: '#02060b', hor: '#2a5878', bot: '#040a10', horY: 0.6, sun: [0.7, 0.36], sunCol: '#cfe2f0', sunSize: 0.22, haze: 0.25 },
    particle: '#d2e6f5', shafts: 0.35 },
  { key: 'rhubarb', name: 'Garden edge at dusk',
    sky: { top: '#0a0305', hor: '#62283a', bot: '#110508', horY: 0.6, sun: [0.42, 0.48], sunCol: '#ffae9e', sunSize: 0.3, haze: 0.2 },
    particle: '#ffc4cc', shafts: 0.8 },
  { key: 'spring', name: 'The spring in the Gauja valley',
    sky: { top: '#040506', hor: '#3a3428', bot: '#050606', horY: 0.6, sun: [0.5, 0.26], sunCol: '#efdcb8', sunSize: 0.26, haze: 0.2 },
    particle: '#f0e2c4', shafts: 0.5 },
];

// x positions that stay out of the bottle's column
function sideX(r, W, portrait, inner = 0.34) {
  const a = portrait ? 0.2 : inner;
  return r() < 0.5 ? r() * W * a : W - r() * W * a;
}


// ---------- photographic worlds ----------
// draw an image to cover a W×H box (like CSS object-fit: cover), anchored at fx/fy
function cover(g, img, W, H, fx = 0.5, fy = 0.5) {
  const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const w = img.naturalWidth * s, h = img.naturalHeight * s;
  g.drawImage(img, (W - w) * fx, (H - h) * fy, w, h);
}
// place a branch cut-out: (x, y) is where its base sits, `width` its drawn width,
// `flip` mirrors it horizontally so it can reach in from the right
function branch(g, img, x, y, width, rot, flip, filter) {
  const h = width * img.naturalHeight / img.naturalWidth;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(flip ? -1 : 1, 1);
  if (filter && 'filter' in g) g.filter = filter;
  g.drawImage(img, -width * 0.02, -h * 0.98, width, h); // base of the branch = lower-left corner of the cut-out
  g.restore();
}

function paintPhotoWorld(i, W, H, imgs, quality) {
  const portrait = H > W, r = rng(1000 + i * 77);
  const [far, gf] = canvas(W, H), [mid, gm] = canvas(W, H), [near, gn] = canvas(W, H);
  // FAR — the photograph, slightly lowered in exposure so the bottle stays the brightest thing
  if ('filter' in gf) gf.filter = 'brightness(.86) saturate(.92)';
  cover(gf, imgs.world, W, H, portrait ? 0.5 : 0.5, 0.5);
  gf.filter = 'none';
  P.grain(gf, W, H, r, 0.03, W * H / 1200);
  // MID — air: a low mist band and a darker ground so the bottle sits in the scene
  P.mist(gm, W, H * 0.7, H * 0.28, WORLD_META[i].sky.hor, 0.18);
  const gr = gm.createLinearGradient(0, H * 0.62, 0, H);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.42)');
  gm.fillStyle = gr; gm.fillRect(0, H * 0.62, W, H * 0.38);
  // NEAR — the flavour's own branch reaching in from the edges, close to the lens
  if (imgs.cut) {
    const f = 'brightness(.9) saturate(.95)';
    if (portrait) {
      branch(gn, imgs.cut, W * 1.08, H * 0.34, W * 0.9, 0.18, true, f);
      branch(gn, imgs.cut, -W * 0.12, H * 1.02, W * 0.8, -0.06, false, 'brightness(.75) saturate(.9)');
    } else {
      branch(gn, imgs.cut, -W * 0.06, H * 1.04, W * 0.4, -0.12, false, f);
      branch(gn, imgs.cut, W * 1.05, H * 0.5, W * 0.34, 0.22, true, 'brightness(.8) saturate(.92)');
    }
  }
  const b = Math.max(W, H) / 1000;
  return {
    photo: true,
    sky: WORLD_META[i].sky,
    layers: { far: blur(far, b * 1.4 * quality), mid, near: blur(near, b * 0.9 * quality) },
  };
}

export function paintWorld(i, W, H, quality = 1) {
  const imgs = worldReady(i);
  if (imgs?.world) return paintPhotoWorld(i, W, H, imgs, quality);
  const portrait = H > W;
  const r = rng(1000 + i * 77);
  const s = Math.min(W, H) / 1100; // stroke scale
  const [far, gf] = canvas(W, H), [mid, gm] = canvas(W, H), [near, gn] = canvas(W, H);
  const k = WORLD_META[i].key;

  if (k === 'buckthorn') {
    // FAR — distant pine trunks dissolving into warm dune haze
    P.mist(gf, W, H * 0.58, H * 0.4, '#a05a22', 0.26);
    for (let n = 0; n < (portrait ? 26 : 46); n++) {
      const x = r() * W, w = W * (0.0025 + r() * 0.004) * (portrait ? 1.6 : 1);
      P.pine(gf, x, H * (0.74 + r() * 0.04), -H * 0.05, w, { dark: '#24160c', mid: '#3c2414', rim: '#7a4a22', crown: { base: '#1c160c', light: '#4a3418' } }, r, x < W * 0.64 ? 1 : -1);
    }
    P.mist(gf, W, H * 0.66, H * 0.22, '#a8642a', 0.3);
    P.ridge(gf, W, H * 0.8, H * 0.012, '#1e1209', r, 2, H);
    for (let n = 0; n < 60; n++) P.grass(gf, r() * W, H * 0.79, H * 0.05, 6, '#2a1a0c', r, 0.2);
    // MID — closer pines with rim light from the low sun, marram grass on the dune
    for (let n = 0; n < (portrait ? 5 : 9); n++) {
      const x = sideX(r, W, portrait, 0.32), w = W * (0.012 + r() * 0.01) * (portrait ? 1.8 : 1);
      P.pine(gm, x, H * 1.04, -H * 0.1, w, { dark: '#170d06', mid: '#3a2210', rim: '#c4782e', crown: { base: '#120d07', light: '#3c2a12' } }, r, x < W * 0.64 ? 1 : -1);
    }
    P.ridge(gm, W, H * 0.9, H * 0.02, '#160d06', r, 1.5, H);
    for (let n = 0; n < 70; n++) P.grass(gm, r() * W, H * (0.9 + r() * 0.08), H * (0.1 + r() * 0.08), 9, '#2c1d0e', r, 0.35 + (r() - 0.5) * 0.3, '#8a5a24');
    for (let n = 0; n < 16; n++) P.tansy(gm, sideX(r, W, portrait), H * (0.86 + r() * 0.1), H * 0.012, r);
    for (let n = 0; n < 12; n++) P.umbel(gm, sideX(r, W, portrait), H * (0.85 + r() * 0.1), H * 0.016, '#e8dcc0', r);
    // NEAR — sea buckthorn reaching in from the edges, berries lit from behind
    const cols = { wood: '#2a190e', leaf: '#5d6a4a', under: '#9aa58a', berryCol: '#e46d0a', glowCol: '#ffc062' };
    const reach = portrait ? 0.24 : 0.3;
    P.buckthornBranch(gn, -W * 0.03, H * 0.3, W * reach, H * 0.52, s * 1.3, r, cols);
    P.buckthornBranch(gn, -W * 0.05, H * 0.92, W * (reach - 0.02), H * 0.7, s * 1.5, r, cols);
    P.buckthornBranch(gn, W * 1.03, H * 0.24, W * (1 - reach), H * 0.42, s * 1.2, r, cols);
    P.buckthornBranch(gn, W * 1.05, H * 0.86, W * (1 - reach + 0.02), H * 0.66, s * 1.4, r, cols);
    for (let n = 0; n < 14; n++) P.bokeh(gn, sideX(r, W, portrait, 0.4), r() * H, s * (20 + r() * 50), '#ffb860', 0.12 + r() * 0.12);
  }

  if (k === 'currant') {
    P.mist(gf, W, H * 0.5, H * 0.7, '#5f8068', 0.3);
    for (let n = 0; n < (portrait ? 22 : 38); n++) P.birch(gf, r() * W, H * (0.76 + r() * 0.05), -H * 0.05, W * (0.002 + r() * 0.004) * (portrait ? 1.6 : 1), r, { bark: '#8f9a90', dark: '#27302a', fog: { col: '#6f8a76', a: 0.35 } });
    for (let n = 0; n < 50; n++) { P.glow(gf, r() * W, r() * H * 0.35, s * (60 + r() * 120), '#12261a', 0.6); }
    P.mist(gf, W, H * 0.68, H * 0.3, '#7c9c84', 0.42);
    for (let n = 0; n < (portrait ? 4 : 7); n++) P.birch(gm, sideX(r, W, portrait, 0.33), H * 1.04, -H * 0.1, W * (0.01 + r() * 0.008) * (portrait ? 1.8 : 1), r, { bark: '#c8cdc2', dark: '#141814', fog: { col: '#2a3a2e', a: 0.25 } });
    for (let n = 0; n < 14; n++) P.fern(gm, sideX(r, W, portrait, 0.42), H * (0.98 + r() * 0.04), H * (0.2 + r() * 0.12), -Math.PI / 2 + (r() - 0.5) * 1.6, '#24402a', r);
    for (let n = 0; n < 50; n++) P.grass(gm, r() * W, H * 1.0, H * (0.06 + r() * 0.06), 7, '#1c3020', r, (r() - 0.5) * 0.6, '#5c7e5a');
    const cols = { wood: '#241e14', leaf: '#2c5428', berryCol: '#17101e', glowCol: '#5a4278' };
    const reach = portrait ? 0.22 : 0.29;
    P.currantSprig(gn, -W * 0.04, H * 0.28, W * reach, H * 0.46, s * 1.4, r, cols);
    P.currantSprig(gn, -W * 0.04, H * 0.88, W * (reach - 0.04), H * 0.7, s * 1.5, r, cols);
    P.currantSprig(gn, W * 1.04, H * 0.34, W * (1 - reach), H * 0.5, s * 1.3, r, cols);
    P.currantSprig(gn, W * 1.04, H * 0.95, W * (1 - reach + 0.04), H * 0.76, s * 1.5, r, cols);
    for (let n = 0; n < 40; n++) P.droplet(gn, sideX(r, W, portrait, 0.38), r() * H, s * (2 + r() * 4));
  }

  if (k === 'juniper') {
    const hy = H * 0.63;
    P.mist(gf, W, hy - H * 0.05, H * 0.3, '#5f88a8', 0.3);
    gf.fillStyle = '#0c1a26';
    for (let n = 0; n < 90; n++) { const x = r() * W; P.spruce(gf, x, hy + H * 0.01, H * (0.05 + r() * 0.07), W * (0.008 + r() * 0.008), '#0c1a26', r); }
    gf.fillRect(0, hy, W, H - hy);
    P.mist(gf, W, hy + H * 0.02, H * 0.12, '#9cc0dc', 0.45);
    // MID — open bog: dark plain, pools holding the sky, stunted pines
    const [plain, gp] = canvas(W, H);
    const bg = gp.createLinearGradient(0, hy, 0, H); bg.addColorStop(0, '#13283a'); bg.addColorStop(1, '#050b11');
    gp.fillStyle = bg; gp.fillRect(0, hy + H * 0.015, W, H);
    for (let n = 0; n < 16; n++) {
      const py = hy + H * (0.04 + Math.pow(r(), 1.5) * 0.3), pw = W * (0.04 + r() * 0.12) * (1 + (py - hy) / H * 2), ph = pw * 0.12;
      const pg = gp.createLinearGradient(0, py - ph, 0, py + ph); pg.addColorStop(0, '#5b86a6'); pg.addColorStop(1, '#2a4a62');
      gp.fillStyle = pg; gp.beginPath(); gp.ellipse(r() * W, py, pw, ph, 0, 0, P.TAU); gp.fill();
    }
    for (let n = 0; n < 160; n++) P.glow(gp, r() * W, hy + r() * (H - hy), s * (6 + r() * 14), '#3a1a20', 0.5);
    gm.drawImage(plain, 0, 0);
    for (let n = 0; n < (portrait ? 6 : 11); n++) { const x = sideX(r, W, portrait, 0.38); P.bogPine(gm, x, hy + H * (0.04 + r() * 0.1), H * (0.12 + r() * 0.16), '#070e14', r); }
    for (let n = 0; n < 60; n++) { const x = r() * W, y = H * (0.82 + r() * 0.18); P.grass(gm, x, y, H * 0.05, 3, '#1e2a24', r); P.bokeh(gm, x + (r() - 0.5) * 6, y - H * 0.05, s * (5 + r() * 4), '#e6eef2', 0.7, 0.2); }
    const cols = { wood: '#1e1a14', needle: '#1f3a30', light: '#6d988a', berryCol: '#24385a' };
    const reach = portrait ? 0.22 : 0.29;
    P.juniperSprig(gn, -W * 0.04, H * 0.34, W * reach, H * 0.5, s * 1.5, r, cols);
    P.juniperSprig(gn, -W * 0.03, H * 0.95, W * (reach - 0.03), H * 0.74, s * 1.7, r, cols);
    P.juniperSprig(gn, W * 1.04, H * 0.3, W * (1 - reach), H * 0.44, s * 1.4, r, cols);
    P.juniperSprig(gn, W * 1.04, H * 0.92, W * (1 - reach + 0.03), H * 0.72, s * 1.6, r, cols);
    for (let n = 0; n < 7; n++) P.broadLeaf(gn, W * (r() < 0.5 ? 0.06 + r() * 0.1 : 0.84 + r() * 0.1), H * (0.6 + r() * 0.3), r() * P.TAU, s * 18, '#45503a', { lobes: 0, r });
  }

  if (k === 'rhubarb') {
    const hy = H * 0.62;
    P.mist(gf, W, hy - H * 0.1, H * 0.4, '#9a4a58', 0.28);
    for (let n = 0; n < 70; n++) P.spruce(gf, r() * W, hy + H * 0.02, H * (0.16 + r() * 0.2), W * (0.012 + r() * 0.012), '#190a0f', r);
    for (let n = 0; n < 30; n++) P.glow(gf, r() * W, hy - H * r() * 0.15, s * (40 + r() * 80), '#1a0a10', 0.7);
    gf.fillStyle = '#12070b'; gf.fillRect(0, hy + H * 0.015, W, H);
    P.mist(gf, W, hy + H * 0.03, H * 0.12, '#c07080', 0.35);
    // MID — rose thicket masses and rhubarb leaves
    for (let n = 0; n < 40; n++) P.glow(gm, sideX(r, W, portrait, 0.42), H * (0.62 + r() * 0.3), s * (50 + r() * 90), '#1a0d10', 0.9);
    for (let n = 0; n < 26; n++) P.rose(gm, sideX(r, W, portrait, 0.4), H * (0.62 + r() * 0.3), s * (8 + r() * 8), '#a8506a', r, 0.9);
    P.rhubarbLeaf(gm, W * (portrait ? 0.08 : 0.14), H * 0.9, H * 0.16, -0.35, r);
    P.rhubarbLeaf(gm, W * (portrait ? 0.92 : 0.86), H * 0.94, H * 0.18, 0.4, r);
    P.rhubarbLeaf(gm, W * (portrait ? 0.02 : 0.04), H * 1.02, H * 0.13, 0.1, r);
    const cols = { wood: '#34201c', leaf: '#2a4226', petal: '#d0567a', hip: '#c8341c' };
    const reach = portrait ? 0.22 : 0.29;
    P.roseBranch(gn, -W * 0.04, H * 0.3, W * reach, H * 0.46, s * 1.3, r, cols);
    P.roseBranch(gn, -W * 0.04, H * 0.92, W * (reach - 0.03), H * 0.72, s * 1.4, r, cols);
    P.roseBranch(gn, W * 1.04, H * 0.26, W * (1 - reach), H * 0.42, s * 1.2, r, cols);
    P.roseBranch(gn, W * 1.04, H * 0.88, W * (1 - reach + 0.03), H * 0.7, s * 1.4, r, cols);
  }

  if (k === 'spring') {
    // FAR — red Devonian sandstone of the Gauja valley under pines, river mist
    P.sandstone(gf, W, H * 0.3, H * 0.66, { base: '#4a2316', shadow: '#140806', light: '#7a3e24' }, r);
    for (let n = 0; n < 60; n++) { const x = r() * W; P.pine(gf, x, H * (0.33 + Math.sin(x / W * 5 + 1.3) * 0.04), -H * 0.02, W * 0.003, { dark: '#0a0806', mid: '#1a120c', rim: '#3a2a1c', crown: { base: '#0a0a08', light: '#1c1a14' } }, r); }
    P.mist(gf, W, H * 0.62, H * 0.18, '#b0a080', 0.4);
    // MID — the river, holding the light
    P.water(gm, W, H * 0.66, H, '#3a3226', '#040505', r);
    for (let n = 0; n < 40; n++) P.grass(gm, sideX(r, W, portrait, 0.3), H * (0.7 + r() * 0.3), H * (0.08 + r() * 0.1), 8, '#121410', r, (r() - 0.5) * 0.4, '#4a4a36');
    // NEAR — ferns and pine boughs framing the corners
    for (let n = 0; n < 8; n++) P.fern(gn, r() < 0.5 ? -W * 0.02 : W * 1.02, H * (0.8 + r() * 0.25), H * (0.3 + r() * 0.15), -Math.PI / 2 + (r() < 0.5 ? 0.7 : -0.7) * (0.5 + r()), '#1e2a1a', r);
    P.juniperSprig(gn, -W * 0.05, H * 0.05, W * (portrait ? 0.2 : 0.26), H * 0.18, s * 1.4, r, { wood: '#1a140e', needle: '#18261c', light: '#3e5a46', berryCol: '#1a2430' });
    P.juniperSprig(gn, W * 1.05, H * 0.1, W * (portrait ? 0.8 : 0.74), H * 0.2, s * 1.3, r, { wood: '#1a140e', needle: '#18261c', light: '#3e5a46', berryCol: '#1a2430' });
  }

  P.grain(gf, W, H, r, 0.04, W * H / 900); P.grain(gm, W, H, r, 0.04, W * H / 900);
  const b = Math.max(W, H) / 1000;
  return {
    sky: WORLD_META[i].sky,
    layers: {
      far: blur(far, b * 6 * quality),
      mid: blur(mid, b * 3.4 * quality),
      near: blur(near, b * 2.2 * quality),
    },
  };
}

// small sprites that fly past the camera between worlds ("moving deeper into the forest")
export function paintFlyer(i, kind, size = 256) {
  const [c, g] = canvas(size, size), r = rng(4000 + i * 31 + kind * 7);
  const cut = worldReady(i)?.cut;
  if (cut) {
    // a piece of the real branch: kind 0 = the fruit-heavy middle, kind 1 = the whole sprig
    const iw = cut.naturalWidth, ih = cut.naturalHeight;
    if (kind === 0) g.drawImage(cut, iw * 0.3, ih * 0.15, iw * 0.42, ih * 0.6, 0, size * 0.1, size, size * 0.85);
    else { const h = size * ih / iw; g.drawImage(cut, 0, (size - h) / 2, size, h); }
    return c;
  }
  const s = size / 256, m = size / 2;
  const key = WORLD_META[i].key;
  if (key === 'buckthorn') {
    if (kind === 0) for (let n = 0; n < 7; n++) P.berry(g, m + (r() - 0.5) * 90 * s, m + (r() - 0.5) * 70 * s, (16 + r() * 8) * s, '#e46d0a', { glowCol: '#ffc062', oval: 1.12, rot: r() * 6, calyx: 'dot' });
    else P.lanceLeaf(g, 20 * s, m, -0.15, 210 * s, 22 * s, '#5d6a4a', '#9aa58a');
  } else if (key === 'currant') {
    if (kind === 0) P.broadLeaf(g, m, m, r() * 6, 90 * s, '#2c5428', { lobes: 3, dew: 6, r });
    else for (let n = 0; n < 5; n++) P.berry(g, m + (r() - 0.5) * 80 * s, m + (r() - 0.5) * 80 * s, 20 * s, '#17101e', { glowCol: '#5a4278', calyx: 'star' });
  } else if (key === 'juniper') {
    if (kind === 0) for (let n = 0; n < 5; n++) P.berry(g, m + (r() - 0.5) * 90 * s, m + (r() - 0.5) * 90 * s, 22 * s, '#24385a', { bloom: 1, spec: 0.35, backlit: 0.1 });
    else P.juniperSprig(g, 10 * s, size - 30 * s, size - 20 * s, 30 * s, s * 1.4, r);
  } else if (key === 'rhubarb') {
    if (kind === 0) P.rose(g, m, m, 100 * s, '#d0567a', r);
    else for (let n = 0; n < 4; n++) { g.save(); g.translate(m + (r() - 0.5) * 100 * s, m + (r() - 0.5) * 100 * s); g.rotate(r() * 6); g.fillStyle = P.rgba('#e07a96', 0.9); g.beginPath(); g.ellipse(0, 0, 40 * s, 26 * s, 0, 0, P.TAU); g.fill(); g.restore(); }
  } else {
    P.bokeh(g, m, m, 100 * s, '#f0e2c4', 0.5);
  }
  return c;
}

// soft foreground frames that sit in front of the bottle, deeply out of focus
export function paintForeground(i, size = 512) {
  const [c, g] = canvas(size, size), r = rng(7000 + i * 13), s = size / 512;
  const cut = worldReady(i)?.cut;
  if (cut) {
    const h = size * cut.naturalHeight / cut.naturalWidth;
    if ('filter' in g) g.filter = 'brightness(.7) saturate(.9)';
    g.drawImage(cut, 0, size - h, size, h);
    return blurred(c, size * 0.012);
  }
  const key = WORLD_META[i].key;
  if (key === 'buckthorn') P.buckthornBranch(g, 0, size * 0.9, size * 0.85, size * 0.35, s * 2.2, r, { wood: '#2a190e', leaf: '#4d5a3a', under: '#7a8568', berryCol: '#d8620a', glowCol: '#ffb050' }, 1.3);
  else if (key === 'currant') P.currantSprig(g, 0, size * 0.85, size * 0.9, size * 0.3, s * 2.2, r);
  else if (key === 'juniper') P.juniperSprig(g, 0, size * 0.9, size * 0.9, size * 0.3, s * 2.4, r);
  else if (key === 'rhubarb') P.roseBranch(g, 0, size * 0.9, size * 0.8, size * 0.35, s * 2, r);
  else P.fern(g, size * 0.05, size, size * 0.9, -Math.PI / 2 + 0.6, '#1e2a1a', r);
  return blurred(c, size * 0.022);
}
