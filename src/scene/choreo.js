import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { faceRot, REG, R, pyToY, SUGAR_PY, BOT_PY } from './label.js';
import { CAP_TOP } from './bottle.js';

const TWO = Math.PI * 2;
const nearest = (cur, tgt) => tgt + Math.round((cur - tgt) / TWO) * TWO;
const spin = (cur, tgt, turns = 0) => { let v = nearest(cur, tgt); while (v > cur - 0.25) v -= TWO; return v - turns * TWO; };

export const ANCHORS = {
  sugar: { u: (60 + 360) / 2 / 2048, y: pyToY(SUGAR_PY - 12) },
  botanical: { u: REG.botanical, y: pyToY(BOT_PY) },
};

function framing(m) {
  return m ? {
    hero: { p: [0, 0.78, 6.3], l: [0, 0.74, 0] },
    push: { p: [0, 0.95, 5.2], l: [0, 0.8, 0] },
    diag: s => ({ p: [-0.1 * s, 0.25, 6.5], l: [0.1 * s, 0.6, 0] }),
    off: 0.14, tilt: 0.08, macro: 1.35, exit: 2.6,
    wide: { p: [0, 0.9, 10.2], l: [0, 0.55, 0] }, row: 0.53, rowS: 0.72,
  } : {
    hero: { p: [0, 1.12, 5.0], l: [0, 1.12, 0] },
    push: { p: [0, 1.26, 3.75], l: [0, 1.16, 0] },
    diag: s => ({ p: [-0.3 * s, 0.48, 4.35], l: [0.32 * s, 1.22, 0] }),
    off: 0.62, tilt: 0.14, macro: 1.0, exit: 3.5,
    wide: { p: [0, 1.62, 7.9], l: [0, 1.52, 0] }, row: 0.96, rowS: 0.86,
  };
}

export function buildExperience({ S, B, RM, mobile, scrollEl }) {
  const F = framing(mobile);
  gsap.set('#overlay .pi, #overlay .ci, #overlay .ti, #wordmark', { clearProps: 'all' });
  Object.assign(S, { v: 0 });
  Object.assign(S.cam, { x: F.hero.p[0], y: F.hero.p[1], z: F.hero.p[2] });
  Object.assign(S.look, { x: F.hero.l[0], y: F.hero.l[1], z: F.hero.l[2] });
  B.forEach((b, i) => Object.assign(b, { x: i ? 7 : 0, y: 0, z: 0, ry: 0, rz: 0, s: 1 }));
  const r = [0, 0, 0, 0];

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
  const go = (o, vars, at, d = 0.5, ease) => (RM ? tl.set(o, vars, at + d * 0.5) : tl.to(o, { ...vars, duration: d, ease: ease || 'power2.inOut' }, at));
  const cam = (f, at, d = 0.5, ease) => {
    if (RM) return;
    tl.to(S.cam, { x: f.p[0], y: f.p[1], z: f.p[2], duration: d, ease: ease || 'power2.inOut' }, at);
    tl.to(S.look, { x: f.l[0], y: f.l[1], z: f.l[2], duration: d, ease: ease || 'power2.inOut' }, at);
  };
  const show = (sel, at, d = 0.3) => tl.fromTo(sel, { autoAlpha: 0, y: RM ? 0 : 26 }, { autoAlpha: 1, y: 0, duration: d, ease: 'power2.out', immediateRender: false }, at);
  const hide = (sel, at, d = 0.25) => tl.to(sel, { autoAlpha: 0, y: RM ? 0 : -18, duration: d, ease: 'power2.in' }, at);

  // HERO → PUSH IN: the bottle turns to its batch panel while the camera walks in
  tl.addLabel('top', 0);
  hide('#p-hero .pi, #p-meta .pi', 0.02, 0.22); hide('#p-cue .pi', 0, 0.12);
  tl.to('#wordmark', { autoAlpha: 0, scale: RM ? 1 : 1.2, duration: 0.75, ease: 'power1.in' }, 0.04);
  r[0] = spin(0, faceRot(REG.batch)); go(B[0], { ry: r[0] }, 0, 1.0);
  cam(F.push, 0, 1.0);
  show('#p-intro .pi', 0.32); hide('#p-intro .pi', 0.92);

  // FLAVOUR: diagonal hero → macro details on the label → release
  const showcase = (i, T, s, details) => {
    tl.addLabel('v' + i, T);
    r[i] = spin(r[i], faceRot(REG.front), 1);
    go(B[i], { x: F.off * s, rz: F.tilt * s, ry: r[i] }, T, 1.0);
    cam(F.diag(s), T, 1.0);
    show(`#p-v${i} .pi`, T + 0.38); hide(`#p-v${i} .pi`, T + 1.02, 0.22);
    let t = T + 1.0;
    for (const d of details) {
      if (d.cap) {
        go(B[i], { x: 0, rz: 0 }, t, 0.45);
        cam({ p: [0.2, CAP_TOP + 0.36, mobile ? 1.05 : 0.8], l: [0, CAP_TOP - 0.04, 0] }, t, 0.5);
      } else {
        r[i] = nearest(r[i], faceRot(d.u));
        go(B[i], { x: 0, rz: 0, ry: r[i] }, t, 0.45);
        cam({ p: [0.06, d.y + 0.05, R + F.macro], l: [0, d.y, R * 0.4] }, t, 0.5);
      }
      show(`#${d.id} .ci`, t + 0.36, 0.14); hide(`#${d.id} .ci`, t + 0.64, 0.12);
      t += 0.78;
    }
    r[i] = spin(r[i], faceRot(REG.front));
    go(B[i], { x: 0, rz: 0, ry: r[i] }, t, 0.6);
    cam(F.hero, t, 0.6);
    return t + 0.6;
  };

  // HAND-OFF: the bottle leaves, the forest changes around the camera, the next one arrives
  const transition = (i, j, T, dir) => {
    tl.addLabel('t' + i, T);
    r[i] -= 1.9;
    go(B[i], { x: dir * F.exit, ry: r[i], rz: -dir * 0.32, y: 0.16 }, T, 0.85, 'power2.in');
    r[j] = faceRot(REG.front);
    if (RM) tl.set(B[j], { x: 0, ry: r[j], rz: 0, y: 0 }, T + 0.45);
    else tl.fromTo(B[j], { x: -dir * F.exit, ry: r[j] + 1.9, rz: -dir * 0.32, y: -0.08 }, { x: 0, ry: r[j], rz: 0, y: 0, duration: 0.85, ease: 'power2.out', immediateRender: false }, T + 0.28);
    tl.to(S, { v: j, duration: 1.0, ease: 'sine.inOut' }, T + 0.05);
    cam({ p: [F.hero.p[0], F.hero.p[1], F.hero.p[2] - 0.45], l: F.hero.l }, T, 0.55);
    cam(F.hero, T + 0.58, 0.55);
    return T + 1.18;
  };

  const SUGAR = ANCHORS.sugar, BOT = ANCHORS.botanical;
  let t = 1.0;
  t = showcase(0, t, 1, [{ ...SUGAR, id: 'c0a' }, { ...BOT, id: 'c0b' }, { cap: true, id: 'c0c' }]);
  t = transition(0, 1, t, -1);
  t = showcase(1, t, -1, [{ ...BOT, id: 'c1' }]);
  t = transition(1, 2, t, 1);
  t = showcase(2, t, 1, [{ ...BOT, id: 'c2' }]);
  t = transition(2, 3, t, -1);
  t = showcase(3, t, -1, [{ ...BOT, id: 'c3' }]);

  // THE RANGE: we arrive at the spring; the current bottle steps aside and the others rise into a row
  tl.addLabel('range', t);
  const xs = [-1.5, -0.5, 0.5, 1.5].map(k => k * F.row), fr = faceRot(REG.front);
  go(B[3], { x: xs[3], ry: nearest(r[3], fr - 0.22), s: F.rowS }, t, 0.6);
  for (let k = 0; k < 3; k++) {
    tl.set(B[k], { x: xs[k], y: -3.4, z: 0, rz: 0, s: F.rowS, ry: fr + 1.4 }, t);
    go(B[k], { y: 0, ry: fr + (k - 1.5) * -0.16 }, t + 0.28 + k * 0.12, 0.8, 'power3.out');
  }
  cam(F.wide, t, 0.9);
  tl.to(S, { v: 4, duration: 0.9, ease: 'sine.inOut' }, t);
  show('#p-line .pi', t + 0.55, 0.3);
  show('#overlay .tag .ti', t + 0.8, 0.25);
  tl.to({}, { duration: 0.9 }, t + 1.0); // let the range breathe before the page moves on
  // clear the range copy before the ingredients page slides over the stage
  hide('#p-line .pi', t + 1.62, 0.22); hide('#overlay .tag .ti', t + 1.62, 0.18);
  tl.to({}, { duration: 0.35 }, t + 1.85);
  tl.addLabel('end', tl.duration());

  const pace = mobile ? 82 : 92;
  scrollEl.style.height = tl.duration() * pace + 100 + 'vh';
  const st = ScrollTrigger.create({ trigger: scrollEl, start: 'top top', end: 'bottom bottom', scrub: RM ? true : 0.55, animation: tl });
  return { tl, st };
}

// ORIGIN: the bottle comes back, standing by the spring, while the story is told beside it
export function buildOrigin({ O, RM, mobile, section }) {
  const fr = faceRot(REG.front), batch = faceRot(REG.batch) - TWO;
  const bx = mobile ? 0 : 0.85;
  // on phones the bottle stands a little smaller, so the cap stays clear of the nav bar
  const bs = mobile ? 0.8 : 1;
  const look = mobile ? [0, 0.78, 0] : [0.5, 1.12, 0];
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
  tl.fromTo(O.b, { x: bx, y: -3.2, z: 0, ry: fr + 2.4, rz: 0.1, s: bs }, { y: 0, ry: fr - 0.25, rz: 0, duration: RM ? 0.01 : 0.32, ease: 'power3.out', immediateRender: true }, 0);
  if (!RM) {
    tl.fromTo(O.cam, { x: bx - 1.1, y: mobile ? 0.4 : 0.6, z: mobile ? 7.0 : 6.0 }, { x: bx + 0.45, y: mobile ? 0.9 : 1.3, z: mobile ? 6.6 : 5.5, duration: 1, ease: 'none', immediateRender: true }, 0);
    tl.fromTo(O.look, { x: look[0], y: look[1], z: 0 }, { x: look[0] + 0.1, y: look[1] + 0.05, z: 0, duration: 1, ease: 'none', immediateRender: true }, 0);
    tl.to(O.b, { ry: batch, duration: 0.35 }, 0.42);
    tl.to(O.b, { y: mobile ? 0.08 : 0.22, ry: batch - 0.6, duration: 0.25 }, 0.75);
  } else {
    Object.assign(O.cam, { x: bx, y: 1.1, z: 5.6 }); Object.assign(O.look, { x: look[0], y: look[1], z: 0 });
  }
  section.querySelectorAll('[data-step]').forEach((el, k) => {
    tl.fromTo(el, { autoAlpha: 0, y: RM ? 0 : 24 }, { autoAlpha: 1, y: 0, duration: 0.08, ease: 'power2.out', immediateRender: false }, 0.12 + k * 0.14);
  });
  const st = ScrollTrigger.create({ trigger: section, start: 'top bottom', end: 'bottom top', scrub: RM ? true : 0.6, animation: tl });
  return { tl, st };
}
