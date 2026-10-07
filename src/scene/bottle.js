import * as THREE from 'three';
import { rng, TAU, canvas } from './paint.js';
import { R, LABEL_Y0, LABEL_H, LBL, makeLabelTexture, makeCapTexture } from './label.js';

export const CAP_TOP = 2.245;
export const FILL = 1.985;

const RAW = [
  [0, 0], [0.29, 0], [0.334, 0.012], [0.352, 0.035], [0.36, 0.07], [0.36, 1.34], [0.357, 1.42], [0.346, 1.5], [0.322, 1.58],
  [0.285, 1.655], [0.235, 1.73], [0.185, 1.8], [0.15, 1.87], [0.132, 1.94], [0.126, 2.0], [0.126, 2.105], [0.142, 2.118], [0.146, 2.14], [0.14, 2.16], [0.128, 2.165],
].map(([x, y]) => new THREE.Vector2(x, y));

// Resample the profile by arc length so texture rows map evenly onto the glass
// (droplets keep their shape on the long straight body and on the shoulder alike).
function resample(pts, n) {
  const seg = [0];
  for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const total = seg[seg.length - 1], out = [];
  for (let k = 0; k < n; k++) {
    const d = (k / (n - 1)) * total;
    let i = 1; while (i < seg.length - 1 && seg[i] < d) i++;
    const t = (d - seg[i - 1]) / Math.max(1e-6, seg[i] - seg[i - 1]);
    out.push(new THREE.Vector2().lerpVectors(pts[i - 1], pts[i], t));
  }
  return out;
}

let shared = null;
function getShared(Q) {
  if (shared) return shared;
  const profile = resample(RAW, 110);
  const glassGeo = new THREE.LatheGeometry(profile, Q.seg);
  const dropGeo = new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(p.x * 1.006 + (p.x > 0.01 ? 0.0012 : 0), p.y)), Q.seg);

  const liquidPts = [new THREE.Vector2(0, 0.035)];
  for (const p of RAW) { if (p.y < 0.035) continue; if (p.y > FILL) break; liquidPts.push(new THREE.Vector2(p.x * 0.935, p.y)); }
  const lastR = liquidPts[liquidPts.length - 1].x;
  liquidPts.push(new THREE.Vector2(lastR * 0.97, FILL), new THREE.Vector2(0, FILL));
  const liquidGeo = new THREE.LatheGeometry(resample(liquidPts, 70), Math.round(Q.seg * 0.6));

  const labelGeo = new THREE.CylinderGeometry(R, R, LABEL_H, Q.seg, 1, true, -LBL / 2, LBL);
  labelGeo.translate(0, LABEL_Y0 + LABEL_H / 2, 0);

  const capGeo = new THREE.CylinderGeometry(0.136, 0.153, 0.085, 84, 3, true);
  const pos = capGeo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const a = Math.atan2(v.x, v.z), low = THREE.MathUtils.clamp((0.0425 - v.y) / 0.085, 0, 1);
    const crimp = 1 + 0.075 * low * Math.max(0, Math.cos(21 * a));
    pos.setXYZ(i, v.x * crimp, v.y, v.z * crimp);
  }
  capGeo.computeVertexNormals(); capGeo.translate(0, 2.2025, 0);
  const capTopGeo = new THREE.CircleGeometry(0.136, 64); capTopGeo.rotateX(-Math.PI / 2); capTopGeo.translate(0, CAP_TOP, 0);

  // glass: fresnel body (normal blend) + reflection layer (additive) — reads as glass over any backdrop
  const glassMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTint: { value: new THREE.Color('#b9cbc0') }, uBase: { value: 0.03 }, uEdge: { value: 0.4 } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uTint; uniform float uBase; uniform float uEdge; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
        gl_FragColor = vec4(mix(uTint * 0.22, uTint, f * f), uBase + f * uEdge);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const reflMat = new THREE.MeshPhysicalMaterial({
    color: 0x000000, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.5,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const dropMat = new THREE.MeshStandardMaterial({
    map: condensationTexture(Q), transparent: true, depthWrite: false, roughness: 0.12, metalness: 0, envMapIntensity: 1.6,
  });

  const poolTex = (() => {
    const [c, g] = canvas(128, 128), gr = g.createRadialGradient(64, 64, 2, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
  })();
  const shadowTex = (() => {
    const [c, g] = canvas(128, 128), gr = g.createRadialGradient(64, 64, 2, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,.8)'); gr.addColorStop(0.3, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
  })();
  const dotTex = (() => {
    const [c, g] = canvas(32, 32), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.55)'); gr.addColorStop(0.7, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c);
  })();

  shared = { glassGeo, dropGeo, liquidGeo, labelGeo, capGeo, capTopGeo, glassMat, reflMat, dropMat, poolTex, shadowTex, dotTex };
  return shared;
}

// Cold-bottle condensation: beads of all sizes, a few running drips, a faint fog on the glass.
function condensationTexture(Q) {
  const S = Q.dropRes;
  const [c, g] = canvas(S, S), r = rng(404);
  g.fillStyle = 'rgba(235,245,250,0.045)'; g.fillRect(0, 0, S, S);
  const bead = (x, y, rad, stretch = 1) => {
    g.save(); g.translate(x, y); g.scale(1, stretch);
    g.fillStyle = 'rgba(230,240,245,.10)'; g.beginPath(); g.arc(0, 0, rad, 0, TAU); g.fill();
    const rim = g.createRadialGradient(rad * 0.25, rad * 0.3, rad * 0.2, 0, 0, rad);
    rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(0.75, 'rgba(0,0,0,0)'); rim.addColorStop(1, 'rgba(10,20,25,.38)');
    g.fillStyle = rim; g.beginPath(); g.arc(0, 0, rad, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.ellipse(-rad * 0.38, -rad * 0.42, rad * 0.24, rad * 0.16, -0.6, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(rad * 0.25, rad * 0.45, rad * 0.4, rad * 0.14, 0, 0, TAU); g.fill();
    g.restore();
  };
  const k = S / 1024;
  for (let i = 0; i < 2600; i++) bead(r() * S, r() * S, k * (0.8 + r() * 2.2));
  for (let i = 0; i < 420; i++) bead(r() * S, r() * S, k * (2.5 + r() * 4.5), 1 + r() * 0.25);
  for (let i = 0; i < 26; i++) {
    // a drip: thin trail with a heavy bead at its lower end (canvas y grows downward = down the bottle)
    const x = r() * S, y0 = r() * S * 0.7, len = S * (0.06 + r() * 0.22), w = k * (2 + r() * 2.5);
    const tg = g.createLinearGradient(0, y0, 0, y0 + len);
    tg.addColorStop(0, 'rgba(230,240,245,0)'); tg.addColorStop(1, 'rgba(230,240,245,.22)');
    g.fillStyle = tg; g.fillRect(x - w * 0.5, y0, w, len);
    g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(x - w * 0.5, y0, Math.max(1, w * 0.25), len);
    bead(x, y0 + len, w * 1.6, 1.25);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function liquidMaterial(v) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uCore: { value: new THREE.Color(v.liquid) }, uEdge: { value: new THREE.Color(v.liquidEdge) },
      uOpacity: { value: v.lop }, uTime: { value: 0 }, uFill: { value: FILL },
    },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uCore; uniform vec3 uEdge; uniform float uOpacity; uniform float uTime; uniform float uFill;
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){
        float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        // long path through the middle = rich, saturated core; thin edges let the light through
        vec3 col = mix(uCore * 0.55, uEdge * 0.9, pow(f, 1.6));
        // backlight bleeding through the body, strongest a little off-centre
        float through = pow(1.0 - f, 3.0) * (0.5 + 0.5 * smoothstep(0.1, 1.2, vP.y));
        col += uCore * through * 0.28;
        // bright meniscus just under the surface
        float top = smoothstep(uFill - 0.12, uFill - 0.01, vP.y);
        col = mix(col, uEdge * 1.05, top * 0.45);
        // slow caustic ripple
        float a = atan(vP.x, vP.z);
        float sh = sin(vP.y * 26.0 - uTime * 0.9 + sin(a * 5.0 + uTime * 0.6) * 1.6) * 0.5 + 0.5;
        col *= 0.93 + sh * 0.11;
        gl_FragColor = vec4(col, uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

export function createBottle(v, i, Q, maxAniso) {
  const S = getShared(Q);
  const group = new THREE.Group();
  const label = new THREE.Mesh(S.labelGeo, new THREE.MeshStandardMaterial({ map: makeLabelTexture(v, i, Q.labelW, maxAniso), roughness: 0.58, metalness: 0, envMapIntensity: 0.55 }));
  const labelBack = new THREE.Mesh(S.labelGeo, new THREE.MeshStandardMaterial({ color: new THREE.Color(v.paper).multiplyScalar(0.55), roughness: 0.9, side: THREE.BackSide }));
  const liquid = new THREE.Mesh(S.liquidGeo, liquidMaterial(v)); liquid.renderOrder = 1;
  const glass = new THREE.Mesh(S.glassGeo, S.glassMat); glass.renderOrder = 2;
  const refl = new THREE.Mesh(S.glassGeo, S.reflMat); refl.renderOrder = 3;
  const drops = new THREE.Mesh(S.dropGeo, S.dropMat); drops.renderOrder = 4;
  const cap = new THREE.Mesh(S.capGeo, new THREE.MeshStandardMaterial({ color: v.cap, metalness: 0.85, roughness: 0.32, envMapIntensity: 1.2 }));
  const capTop = new THREE.Mesh(S.capTopGeo, new THREE.MeshStandardMaterial({ map: makeCapTexture(v), metalness: 0.75, roughness: 0.38, envMapIntensity: 1.2 }));
  group.add(label, labelBack, liquid, glass, refl, drops, cap, capTop);

  let bubbles = null, bub = null;
  if (Q.bubbles) {
    const n = Q.bubbles, pos = new Float32Array(n * 3), r = rng(5 + i);
    bub = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const a = r() * TAU, rr = Math.sqrt(r()) * 0.27;
      pos[k * 3] = Math.cos(a) * rr; pos[k * 3 + 1] = 0.08 + r() * 1.85; pos[k * 3 + 2] = Math.sin(a) * rr; bub[k] = 0.08 + r() * 0.26;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    bubbles = new THREE.Points(geo, new THREE.PointsMaterial({ map: S.dotTex, size: 0.016, transparent: true, opacity: 0.75, depthWrite: false, color: 0xffffff }));
    bubbles.renderOrder = 1; group.add(bubbles);
  }

  // light passing through the liquid leaves a coloured pool on the ground, next to a soft contact shadow
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: S.shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }));
  shadow.rotation.x = -Math.PI / 2;
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.3), new THREE.MeshBasicMaterial({ map: S.poolTex, color: new THREE.Color(v.liquidEdge), transparent: true, depthWrite: false, opacity: 0.32, blending: THREE.AdditiveBlending }));
  pool.rotation.x = -Math.PI / 2;

  return { group, shadow, pool, bubbles, bub, liquid };
}

export function disposeShared() { shared = null; }
