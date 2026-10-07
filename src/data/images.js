// Photographic assets (generated with GPT Image 2.5 via Higgsfield; prompts in ASSET-PROMPTS.md).
// Imported as modules so the normal build hashes them and the one-file build inlines them.
import plateBuckthorn from '../assets/img/plate-buckthorn.webp';
import plateHoney from '../assets/img/plate-honey.webp';
import plateCurrant from '../assets/img/plate-currant.webp';
import plateJuniper from '../assets/img/plate-juniper.webp';
import plateRose from '../assets/img/plate-rose.webp';
import worldBuckthorn from '../assets/img/world-buckthorn.webp';
import worldCurrant from '../assets/img/world-currant.webp';
import worldJuniper from '../assets/img/world-juniper.webp';
import worldRhubarb from '../assets/img/world-rhubarb.webp';
import worldSpring from '../assets/img/world-spring.webp';
import cutBuckthorn from '../assets/img/cut-buckthorn.webp';
import cutCurrant from '../assets/img/cut-currant.webp';
import cutJuniper from '../assets/img/cut-juniper.webp';
import cutRose from '../assets/img/cut-rose.webp';

export const PLATES = {
  // cropped to 3:4 around the fruit, sized for the ingredient cards
  buckthorn: { src: plateBuckthorn },
  honey: { src: plateHoney },
  currant: { src: plateCurrant },
  juniper: { src: plateJuniper },
  rose: { src: plateRose },
};

// per forest world (same order as WORLD_META): background photo + the flavour's branch cut-out
export const WORLD_IMG = [
  { world: worldBuckthorn, cut: cutBuckthorn },
  { world: worldCurrant, cut: cutCurrant },
  { world: worldJuniper, cut: cutJuniper },
  { world: worldRhubarb, cut: cutRose },
  { world: worldSpring, cut: null },
];

const cache = new Map();
export function loadImage(src) {
  if (!src) return Promise.resolve(null);
  if (!cache.has(src)) {
    cache.set(src, new Promise(res => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => res(im));
      im.onerror = () => res(null);
      im.src = src;
    }));
  }
  return cache.get(src);
}
const ready = new Map();
// resolves to { world, cut } HTMLImageElements; remembers the result for synchronous checks
export function loadWorld(i) {
  const e = WORLD_IMG[i];
  return Promise.all([loadImage(e.world), loadImage(e.cut)]).then(([world, cut]) => { const r = { world, cut }; ready.set(i, r); return r; });
}
export const worldReady = i => ready.get(i) || null;
