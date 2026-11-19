import * as THREE from 'three';
import { TIERS, autoTier } from './LabEngine';

/* Dasar adegan 3D tambahan (intro, pemandu, permainan soal, bunga).
   - Satu renderer per layar yang tampil; dibongkar saat layar ditutup (hanya satu konteks WebGL aktif).
   - Render on-demand: hanya saat ada tween/animasi; animasi diam (idle) dibatasi ±30 fps.
   - Berhenti saat aplikasi di latar belakang (document.hidden).
   - Patuh tingkat kualitas hemat/sedang/tinggi (agents.md aturan 14–15); hemat = tanpa bayangan, dpr 1. */

export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
export const easeIn = (t) => t * t * t;
export const linear = (t) => t;
export const lerp = (a, b, t) => a + (b - a) * t;

export const pickTier = (quality) => (quality === 'auto' ? autoTier() : quality);

export function canvasTexture(w, h, draw, opt = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(/** @type {CanvasRenderingContext2D} */ (c.getContext('2d')), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (opt.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opt.repeat[0], opt.repeat[1]); }
  return t;
}

export class Stage3D {
  /** @param {{canvas: HTMLCanvasElement, container: HTMLElement, tier: 'hemat'|'sedang'|'tinggi', autoQuality?: boolean}} o */
  constructor(o) {
    this.o = o;
    this.tier = o.tier;
    const r = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.05, 400);
    this.tweens = [];
    this.clock = 0;
    this.needsRender = true;
    this.disposed = false;
    this.last = performance.now();
    this.fps = { t: 0, n: 0, checked: false };
    this.skip = false;
    this.viewOffsetY = 0; // geser gambar ke atas (0..0,4 dari tinggi) agar objek tidak tertutup panel HTML
    this.size = { w: 1, h: 1 };
  }

  /** Dipanggil subkelas setelah membangun adegan */
  start() {
    this.applyTier(this.tier);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.o.container);
    this.resize();
    this.raf = requestAnimationFrame(this.frame);
  }

  get shadows() { return this.tier !== 'hemat'; }
  get hemat() { return this.tier === 'hemat'; }

  applyTier(t) {
    this.tier = t;
    const T = TIERS[t];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, T.dpr));
    this.renderer.shadowMap.enabled = t !== 'hemat';
    this.scene.traverse((obj) => {
      const l = /** @type {any} */ (obj);
      if (l.isLight && l.shadow && l.userData.shadow) {
        l.castShadow = t !== 'hemat';
        l.shadow.mapSize.set(T.shadow, T.shadow);
        l.shadow.map?.dispose(); l.shadow.map = null;
      }
      if (l.material) (Array.isArray(l.material) ? l.material : [l.material]).forEach(m => { m.needsUpdate = true; });
    });
    this.resize();
  }

  resize() {
    const el = this.o.container;
    const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
    this.size = { w, h };
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.applyViewOffset();
    this.onResize(w, h);
    this.needsRender = true;
  }

  applyViewOffset() {
    const { w, h } = this.size;
    if (this.viewOffsetY > 0.001) this.camera.setViewOffset(w, h, 0, h * this.viewOffsetY, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  /** @param {number} w @param {number} h */
  onResize(w, h) { void w; void h; }

  /** Animasi 0..1 selama `dur` detik */
  tween(dur, fn, ease = easeInOut) {
    return new Promise((res) => {
      if (dur <= 0) { fn(1); this.needsRender = true; res(undefined); return; }
      this.tweens.push({ t: 0, dur, fn, ease, res });
    });
  }
  wait(sec) { return this.tween(sec, () => {}, linear); }

  /** Hook per frame. Kembalikan 'live' (animasi penuh), 'idle' (gerak halus ±30 fps), atau false (diam). */
  update(dt) { void dt; return false; }

  /** Posisi layar (px CSS) dari titik dunia */
  toScreen(v) {
    const p = v.clone().project(this.camera);
    const { w, h } = this.size;
    return { x: (p.x * 0.5 + 0.5) * w, y: (-p.y * 0.5 + 0.5) * h - h * this.viewOffsetY, behind: p.z > 1 };
  }

  frame = (now) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    if (document.hidden) { this.last = now; return; }
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now; this.clock += dt;
    let active = this.tweens.length > 0;
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      tw.fn(tw.ease(k));
      if (k >= 1) { this.tweens.splice(this.tweens.indexOf(tw), 1); tw.res(undefined); }
    }
    const live = this.update(dt);
    if (live === 'live') active = true;
    if (!active && !live && !this.needsRender) return;
    if (!active && live === 'idle' && !this.needsRender) { this.skip = !this.skip; if (this.skip) return; }
    this.renderer.render(this.scene, this.camera);
    this.needsRender = false;
    this.afterRender();
    if (!this.fps.checked && this.o.autoQuality && active) {
      this.fps.t += dt; this.fps.n++;
      if (this.fps.t > 3) {
        this.fps.checked = true;
        if (this.fps.n / this.fps.t < 28 && this.tier !== 'hemat') this.applyTier('hemat');
      }
    }
  };

  afterRender() {}

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    const seen = new Set();
    this.scene.traverse((obj) => {
      const m = /** @type {any} */ (obj);
      for (const t of m.userData?.textures ?? []) t.dispose();
      if (m.geometry && !seen.has(m.geometry)) { seen.add(m.geometry); m.geometry.dispose(); }
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mat of mats) {
        if (seen.has(mat)) continue;
        seen.add(mat);
        for (const k of ['map', 'normalMap', 'roughnessMap', 'emissiveMap', 'alphaMap', 'bumpMap']) if (mat[k] && !seen.has(mat[k])) { seen.add(mat[k]); mat[k].dispose(); }
        mat.dispose();
      }
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
  }
}
