// Optional photographic plates for the forest worlds.
//
// Every world is painted procedurally by default (src/scene/worlds.js). When real
// photography is ready, drop transparent PNG/WebP layers into /public/plates/ and
// point the matching slot at them; the scene swaps the painted layer for the photo
// and keeps the same parallax, wind, focus and transition behaviour.
//
//   far  — sky-free distant forest, already soft (it will be blurred further)
//   mid  — trunks / ground plane, transparent where the sky should show
//   near — the flavour's own plant entering from the frame edges, centre left empty
//
// Prompts for generating or briefing these plates live in /ASSET-PROMPTS.md.
export const PHOTO_PLATES = {
  buckthorn: { far: null, mid: null, near: null },
  currant: { far: null, mid: null, near: null },
  juniper: { far: null, mid: null, near: null },
  rhubarb: { far: null, mid: null, near: null },
  spring: { far: null, mid: null, near: null },
};
