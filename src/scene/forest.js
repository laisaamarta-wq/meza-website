import * as THREE from 'three';
import { WORLD_META, paintWorld } from './worlds.js';
import { PHOTO_PLATES } from '../data/photos.js';
import { loadWorld, worldReady } from '../data/images.js';
import { canvas } from './paint.js';
import * as P from './paint.js';

// The forest lives on its own canvas behind the bottle. It renders at reduced
// resolution (it is soft by design), with its own camera that follows the
// product camera at a fraction of its movement: that difference is the parallax.

const DEPTH = { far: 34, mid: 17, near: 9 };
const SWAY = { far: 0.0, mid: 0.05, near: 0.12 };
const BIAS = { far: 0.9, mid: 0.5, near: 0.6 };
// grade: the forest stays darker and quieter than the product
const GRADE = { far: 0.42, mid: 0.4, near: 0.5 };
const SAT = { far: 0.6, mid: 0.68, near: 0.74 };
// photographs are already low-key: grade them gently
const GRADE_PHOTO = { far: 0.74, mid: 1, near: 0.9 };
const SAT_PHOTO = { far: 0.88, mid: 1, near: 0.96 };

const layerVS = `
  uniform float uTime; uniform float uSway; varying vec2 vUv;
  void main(){
    vUv = uv; vec3 p = position;
    // wind: slow, low-frequency bending, stronger toward the frame edges where branches enter
    float edge = 1.0 - smoothstep(0.0, 0.42, min(uv.x, 1.0 - uv.x));
    float w = sin(uTime * 0.55 + p.y * 0.42 + p.x * 0.18) + 0.45 * sin(uTime * 1.31 + p.x * 0.7 + p.y * 0.3);
    p.x += uSway * w * (0.25 + edge);
    p.y += uSway * 0.35 * sin(uTime * 0.83 + p.x * 0.5) * edge;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;
const layerFS = `
  uniform sampler2D map; uniform float uOpacity; uniform float uBias; uniform vec3 uTint; uniform vec2 uTexel; uniform float uSat; varying vec2 vUv;
  void main(){
    // soft focus: mip bias plus a small rotated tap pattern so blur stays round, not blocky
    vec2 o = uTexel * exp2(uBias) * 0.9;
    vec4 c = texture2D(map, vUv, uBias) * 0.32;
    c += texture2D(map, vUv + vec2( o.x,  o.y * 0.4), uBias) * 0.17;
    c += texture2D(map, vUv + vec2(-o.x * 0.4,  o.y), uBias) * 0.17;
    c += texture2D(map, vUv + vec2(-o.x, -o.y * 0.4), uBias) * 0.17;
    c += texture2D(map, vUv + vec2( o.x * 0.4, -o.y), uBias) * 0.17;
    float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    vec3 rgb = mix(vec3(l), c.rgb, uSat) * uTint;
    gl_FragColor = vec4(rgb * uOpacity, c.a * uOpacity);
    #include <colorspace_fragment>
  }`;

const skyVS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const skyFS = `
  uniform vec3 cTop; uniform vec3 cHor; uniform vec3 cBot; uniform vec3 cSun;
  uniform vec2 uSun; uniform float uHorY; uniform float uSunSize; uniform float uHaze; uniform float uAspect; uniform float uTime; uniform float uOpacity; uniform vec2 uShift;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main(){
    vec2 uv = vUv + uShift;
    vec3 col = uv.y > uHorY ? mix(cHor, cTop, smoothstep(uHorY, 1.05, uv.y)) : mix(cBot, cHor, smoothstep(-0.1, uHorY, uv.y));
    vec2 d = uv - uSun; d.x *= uAspect;
    float breathe = 1.0 + 0.06 * sin(uTime * 0.21);
    col += cSun * exp(-dot(d, d) / (uSunSize * uSunSize * breathe)) * 0.42;
    col += cSun * uHaze * 0.5 * exp(-abs(uv.y - uHorY) * 7.0);
    float vig = smoothstep(1.25, 0.35, length((vUv - 0.5) * vec2(uAspect * 0.9, 1.15)));
    col *= mix(0.35, 1.0, vig);
    col += (hash(vUv * 731.0 + uTime) - 0.5) / 255.0 * 2.0;
    gl_FragColor = vec4(col, uOpacity);
    #include <colorspace_fragment>
  }`;

const partVS = `
  uniform float uTime; uniform float uSize; attribute float aSeed; varying float vA;
  void main(){
    vec3 p = position;
    p.x += sin(uTime * 0.13 + aSeed * 6.2831) * 0.8;
    p.y += mod(uTime * (0.05 + aSeed * 0.08) + aSeed * 9.0, 9.0) - 4.5;
    p.z += cos(uTime * 0.1 + aSeed * 3.0) * 0.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.4 + aSeed) * (12.0 / -mv.z);
    vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (0.6 + aSeed) + aSeed * 20.0));
    gl_Position = projectionMatrix * mv;
  }`;
const partFS = `
  uniform vec3 uCol; uniform float uOpacity; varying float vA;
  void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uCol * a * vA * uOpacity, a * vA * uOpacity);
    #include <colorspace_fragment>
  }`;

function shaftTexture() {
  const [c, g] = canvas(128, 512);
  const gx = g.createLinearGradient(0, 0, 128, 0);
  gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(0.5, 'rgba(255,255,255,1)'); gx.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gx; g.fillRect(0, 0, 128, 512);
  g.globalCompositeOperation = 'destination-in';
  const gy = g.createLinearGradient(0, 0, 0, 512);
  gy.addColorStop(0, 'rgba(0,0,0,1)'); gy.addColorStop(0.7, 'rgba(0,0,0,.35)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gy; g.fillRect(0, 0, 128, 512);
  return new THREE.CanvasTexture(c);
}

export class Forest {
  constructor(canvasEl, Q) {
    this.Q = Q;
    this.renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x050505, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.autoClear = false;
    this.scene = new THREE.Scene();
    this.skyScene = new THREE.Scene();
    this.skyCam = new THREE.Camera();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 120);
    this.worlds = new Array(WORLD_META.length).fill(null);
    this.shaftTex = shaftTexture();
    this.time = 0;
    this.visible = true;
    this.portrait = null;
    this.resize();
  }

  get aspect() { return innerWidth / innerHeight; }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5) * this.Q.forestScale;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.camera.aspect = this.aspect; this.camera.updateProjectionMatrix();
    const portrait = innerHeight > innerWidth;
    if (this.portrait !== null && portrait !== this.portrait) {
      // composition is painted per orientation: repaint the worlds that exist
      this.worlds.forEach((w, i) => { if (w) { this.disposeWorld(i); this.ensure(i); } });
    } else this.worlds.forEach(w => w && this.fitWorld(w));
    this.portrait = portrait;
  }

  planeSize(depth, margin = 1.32) {
    const h = 2 * depth * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * margin;
    return [h * this.aspect, h];
  }

  ensure(i) {
    if (this.worlds[i]) return this.worlds[i];
    // photographs load first; until they are decoded the world simply is not built yet
    if (!worldReady(i)) { loadWorld(i); return null; }
    const meta = WORLD_META[i];
    const portrait = innerHeight > innerWidth;
    const texW = portrait ? Math.round(this.Q.forestTex * 0.62) : this.Q.forestTex;
    const texH = Math.round(texW / this.aspect);
    const painted = paintWorld(i, texW, texH, this.Q.forestTex / 1600);
    const group = new THREE.Group();
    const layers = [];
    const loader = new THREE.TextureLoader();
    for (const name of ['far', 'mid', 'near']) {
      const photo = PHOTO_PLATES[meta.key]?.[name];
      const tex = photo ? loader.load(photo) : new THREE.CanvasTexture(painted.layers[name]);
      tex.colorSpace = THREE.SRGBColorSpace; tex.premultiplyAlpha = true; tex.anisotropy = 2;
      const mat = new THREE.ShaderMaterial({
        uniforms: { map: { value: tex }, uOpacity: { value: 0 }, uBias: { value: BIAS[name] }, uTint: { value: new THREE.Color().setScalar(painted.photo ? GRADE_PHOTO[name] : GRADE[name]) }, uTexel: { value: new THREE.Vector2(1 / texW, 1 / texH) }, uSat: { value: painted.photo ? SAT_PHOTO[name] : SAT[name] }, uTime: { value: 0 }, uSway: { value: SWAY[name] } },
        vertexShader: layerVS, fragmentShader: layerFS, transparent: true, depthWrite: false, depthTest: false, premultipliedAlpha: true,
      });
      if (!photo) {
        // upload now, then let the canvas go: the GPU copy is all the scene needs
        this.renderer.initTexture(tex);
        const src = tex.image; tex.image = { width: src.width, height: src.height, data: null }; P.release(src);
      }
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 24, 14), mat);
      mesh.renderOrder = name === 'far' ? 1 : name === 'mid' ? 2 : 3;
      group.add(mesh);
      layers.push({ name, mesh, depth: DEPTH[name] });
    }
    // light shafts falling from the world's light source
    const shafts = [];
    for (let k = 0; k < 4; k++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.shaftTex, color: new THREE.Color(meta.sky.sunCol), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      m.renderOrder = 4; group.add(m); shafts.push({ mesh: m, seed: k * 1.7 + i });
    }
    // drifting particles: pollen, mist motes, petals
    const N = this.Q.particles, pos = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let k = 0; k < N; k++) { pos[k * 3] = (Math.random() - 0.5) * 22; pos[k * 3 + 1] = (Math.random() - 0.5) * 9; pos[k * 3 + 2] = -4 - Math.random() * 22; seed[k] = Math.random(); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const particles = new THREE.Points(pg, new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uSize: { value: 5 * Math.min(devicePixelRatio || 1, 1.5) }, uCol: { value: new THREE.Color(meta.particle) }, uOpacity: { value: 0 } },
      vertexShader: partVS, fragmentShader: partFS, transparent: true, depthWrite: false, depthTest: false, blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    }));
    particles.renderOrder = 5; group.add(particles);

    const s = meta.sky;
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: {
        cTop: { value: new THREE.Color(s.top) }, cHor: { value: new THREE.Color(s.hor) }, cBot: { value: new THREE.Color(s.bot) }, cSun: { value: new THREE.Color(s.sunCol) },
        uSun: { value: new THREE.Vector2(s.sun[0], 1 - s.sun[1]) }, uHorY: { value: 1 - s.horY }, uSunSize: { value: s.sunSize }, uHaze: { value: s.haze },
        uAspect: { value: this.aspect }, uTime: { value: 0 }, uOpacity: { value: 1 }, uShift: { value: new THREE.Vector2() },
      },
      vertexShader: skyVS, fragmentShader: skyFS, transparent: true, depthWrite: false, depthTest: false,
    }));
    sky.frustumCulled = false;
    group.visible = false; sky.visible = false;
    this.scene.add(group); this.skyScene.add(sky);
    const w = { i, group, layers, shafts, particles, sky, meta };
    this.fitWorld(w);
    this.worlds[i] = w;
    return w;
  }

  fitWorld(w) {
    for (const L of w.layers) { const [pw, ph] = this.planeSize(L.depth); L.mesh.scale.set(pw, ph, 1); L.baseW = pw; L.baseH = ph; }
    const [sw, sh] = this.planeSize(DEPTH.mid, 1);
    w.shafts.forEach((s, k) => { s.mesh.scale.set(sw * 0.07 * (1 + k * 0.4), sh * 1.4, 1); s.w = sw; s.h = sh; });
    w.sky.material.uniforms.uAspect.value = this.aspect;
  }

  disposeWorld(i) {
    const w = this.worlds[i]; if (!w) return;
    w.group.traverse(o => { if (o.material) { o.material.uniforms?.map?.value?.dispose?.(); o.material.map?.dispose?.(); o.material.dispose(); } o.geometry?.dispose?.(); });
    w.sky.material.dispose(); w.sky.geometry.dispose();
    this.scene.remove(w.group); this.skyScene.remove(w.sky);
    this.worlds[i] = null;
  }

  // vf: world position (0..4, fractional during a transition)
  // view: { x, y, dolly, focus, mouseX, mouseY }
  update(dt, vf, view) {
    this.time += dt;
    // on phones keep only the worlds next to the camera in memory; they repaint in ~0.1 s if revisited
    if (this.Q.keepWorlds && (this._gc = (this._gc || 0) + 1) % 30 === 0)
      this.worlds.forEach((w, i) => { if (w && Math.abs(i - vf) > this.Q.keepWorlds + 0.6) this.disposeWorld(i); });
    const t = this.time;
    const cam = this.camera;
    cam.position.set(view.x + Math.sin(t * 0.045) * 0.25 + view.mouseX * 0.18, view.y + Math.sin(t * 0.06 + 1) * 0.08 - view.mouseY * 0.1, -view.dolly);
    cam.rotation.set(view.mouseY * 0.01, -view.x * 0.012 - view.mouseX * 0.01, 0);
    const active = [];
    this.worlds.forEach((w, i) => {
      if (!w) return;
      const d = vf - i, wgt = 1 - Math.min(1, Math.abs(d));
      const on = wgt > 0.001;
      w.group.visible = on; w.sky.visible = on;
      if (!on) return;
      active.push([w, wgt]);
      const ease = wgt * wgt * (3 - 2 * wgt);
      // leaving: the world slides past the camera; arriving: it rises out of the depth
      const travel = d > 0 ? d : d * 0.9;
      for (const L of w.layers) {
        const push = travel * (L.name === 'near' ? 7.2 : L.name === 'mid' ? 9 : 10);
        L.mesh.position.set(0, 0, -L.depth + push);
        const z = L.depth - push, scale = z / L.depth; // keep coverage while it moves
        L.mesh.scale.set(L.baseW * scale, L.baseH * scale, 1);
        const u = L.mesh.material.uniforms;
        u.uOpacity.value = L.name === 'far' ? Math.min(1, ease * 1.15) : ease * (d > 0 ? Math.max(0, 1 - d * 1.4) : 1);
        u.uBias.value = BIAS[L.name] + view.focus * (L.name === 'near' ? 2.2 : L.name === 'mid' ? 2.6 : 2.8);
        u.uTime.value = t + i * 10;
      }
      w.shafts.forEach((s, k) => {
        const [sx, sy] = w.meta.sky.sun;
        s.mesh.position.set((sx - 0.5) * s.w + (k - 1.5) * s.w * 0.06 + Math.sin(t * 0.07 + s.seed) * s.w * 0.02, (0.5 - sy) * s.h - s.h * 0.55, -DEPTH.mid - 1);
        s.mesh.rotation.z = -0.32 + (sx - 0.5) * 0.4 + (k - 1.5) * 0.08 + Math.sin(t * 0.05 + s.seed) * 0.03;
        s.mesh.material.opacity = ease * w.meta.shafts * (0.05 + 0.04 * Math.sin(t * 0.3 + s.seed * 2)) * (1 - view.focus * 0.6);
      });
      const pu = w.particles.material.uniforms; pu.uTime.value = t; pu.uOpacity.value = ease;
      const su = w.sky.material.uniforms; su.uTime.value = t; su.uShift.value.set(-view.x * 0.004, view.y * 0.006);
    });
    // sky crossfade: first active world opaque, second blended by its share
    active.sort((a, b) => a[0].i - b[0].i);
    if (active.length === 1) active[0][0].sky.material.uniforms.uOpacity.value = 1;
    else if (active.length === 2) {
      active[0][0].sky.material.uniforms.uOpacity.value = 1;
      active[1][0].sky.material.uniforms.uOpacity.value = active[1][1] / (active[0][1] + active[1][1]);
      active[0][0].sky.renderOrder = 0; active[1][0].sky.renderOrder = 1;
    }
  }

  render() {
    const r = this.renderer;
    r.clear();
    r.render(this.skyScene, this.skyCam);
    r.render(this.scene, this.camera);
  }
}
