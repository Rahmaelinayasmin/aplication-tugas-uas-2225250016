import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { randomFloat as rand, randomInt, seeded } from '../domain/probability/rng';
import { BAG, BALL_COL, ballColor, cardRank, cardSuit, COUPON_COL, couponColor, couponKeys, SPIN,  } from '../domain/probability/spaces';
import { gcd } from '../domain/probability/fraction';

/* Mesin 3D Lab Lapangan (three.js + cannon-es).
   - Hasil lempar dadu & koin DIBACA dari benda yang mendarat (fisika), bukan diatur sebelumnya (agents.md aturan 11).
   - Kartu, roda, kantong: acak kriptografis lalu dianimasikan.
   - Render on-demand; berhenti saat tersembunyi; Mode Fokus = rumput diam (D3). */

export const TIERS = {
  hemat: { dpr: 1, grass: 3500, shadow: 512, ground: 1024 },
  sedang: { dpr: 1.5, grass: 11000, shadow: 1024, ground: 2048 },
  tinggi: { dpr: 2, grass: 30000, shadow: 2048, ground: 2048 }
};
export function autoTier() {
  const nav = navigator;
  const mem = nav.deviceMemory ?? 4, cores = navigator.hardwareConcurrency || 4;
  if (mem <= 3 || cores <= 4) return 'hemat';
  if (mem >= 8 && cores >= 8) return 'tinggi';
  return 'sedang';
}

export const COIN_STYLES = {
  emas: { a: '#FBE3A1', b: '#D2A845', edge: '#C49431', relief: 'rgba(110,72,8,', metal: 0.9, rough: 0.3, sym: 'star', name: 'Emas Bintang' },
  perak: { a: '#F8F9FB', b: '#B6BFCB', edge: '#A3ADBA', relief: 'rgba(60,70,85,', metal: 0.9, rough: 0.26, sym: 'leaf', name: 'Perak Daun' },
  perunggu: { a: '#F2B98B', b: '#AD6B3B', edge: '#9B5E35', relief: 'rgba(80,38,10,', metal: 0.85, rough: 0.36, sym: 'house', name: 'Perunggu' },
  jumbo: { a: '#DDF5E8', b: '#A7DCC2', edge: '#86C6AA', relief: 'rgba(46,52,64,', metal: 0.05, rough: 0.55, sym: 'letter', name: 'Jumbo A/G' }
};
export const DIE_STYLES = { klasik: 'Klasik', jeli: 'Jeli', kayu: 'Kayu', angka: 'Angka' };
const DIE_TINT = { klasik: ['#F0E9FF', '#FFE6EE'], jeli: ['#B9A3F0', '#F5A1BC'], kayu: ['#EACFA6', '#D8A274'], angka: ['#DCCFF7', '#FBD0DC'] };
export const DIE_SWATCH = ['#B9A3F0', '#F5A1BC'];

const FONT = '"Plus Jakarta Sans", sans-serif';
const PRESS_N = 8;
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

function canvas2d(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

export class LabEngine {
  o;
  renderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 140);
  sun = new THREE.DirectionalLight(0xfff2df, 2.4);
  maxAniso;
  cfg = { mode: 'dice', coinCount: 1, dieCount: 2, spinKind: 'sama', coinStyle: 'emas', dieStyle: 'klasik', couponBox: 'A' };
  cap;
  capWorld = null;
  couponGroup = new THREE.Group();
  couponBoxes = {};
  couponGeo = new THREE.BoxGeometry(0.34, 0.025, 0.22);
  trayCoupons = [];
  tier;
  grass = null;
  grassMat;
  world = new CANNON.World({ gravity: new CANNON.Vec3(0, -28, 0) });
  matObj = new CANNON.Material('obj');
  dice = [];
  coins = [];
  dieGeo;
  coinGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.11, 56);
  cardsGroup = new THREE.Group();
  deck = new THREE.Group();
  cardBackTex;
  cardPlane = new THREE.PlaneGeometry(0.9, 1.3);
  drawnCards = [];
  spinnerGroup = new THREE.Group();
  wheel = new THREE.Group();
  sectorsGroup = null;
  sectorDefs = [];
  bagGroup = new THREE.Group();
  ballGeo = new THREE.SphereGeometry(0.18, 28, 20);
  trayBalls = [];
  tweens = [];
  tags = [];
  sim = null;
  needsRender = true;
  raf = 0;
  last = performance.now();
  fps = { t: 0, n: 0, checked: false };
  cam = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fromPos: new THREE.Vector3(), fromTarget: new THREE.Vector3(), toPos: new THREE.Vector3(), toTarget: new THREE.Vector3(), k: 1, az: 0, dist: 1 };
  drag = null;
  lastTap = 0;
  ro;
  disposed = false;
  evTest = () => false;

  static DECK_POS = new THREE.Vector3(-1.5, 0, -0.1);
  static BAG_POS = new THREE.Vector3(-1.1, 0, 0);
  static WHEEL_Y = 2.05;
  static WHEEL_R = 1.6;
  static FACE_VALUES = [1, 6, 2, 5, 3, 4]; // +x −x +y −y +z −z
  static FACE_N = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(a => new THREE.Vector3(a[0], a[1], a[2]));
  static PRESETS = {
    coin: { pos: [0, 6.6, 8.2], target: [0, 0.4, 0.3] },
    dice: { pos: [0, 7.2, 8.6], target: [0, 0.3, 0.2] },
    cards: { pos: [0, 6.2, 4.9], target: [0.25, 0, 0.25] },
    spinner: { pos: [0, 2.5, 6.6], target: [0, 1.95, 0] },
    bag: { pos: [0.4, 3.5, 6.3], target: [0.55, 0.8, 0.1] },
    coupon: { pos: [0, 3.7, 6.4], target: [0, 0.6, 0.4] },
    cap: { pos: [0, 5.2, 6.4], target: [0, 0.3, 0.4] }
  };

  constructor(o) {
    this.o = o;
    this.tier = o.tier;
    const r = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;
    this.maxAniso = r.capabilities.getMaxAnisotropy();
    this.dieGeo = LabEngine.roundedCube();
    this.buildEnvironment();
    this.buildPitch();
    this.buildGrassMaterial();
    this.buildPhysics();
    this.buildThrowables();
    this.buildCards();
    this.buildSpinner();
    this.buildBag();
    this.buildCoupons();
    this.buildCap();
    this.applyTier(this.tier);
    this.bindPointer();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(o.container);
    this.resize();
    this.showMode();
    this.setCamPreset(this.cfg.mode, true);
    this.raf = requestAnimationFrame(this.frame);
  }

  /* ───────────── public API ───────────── */
  get busy() { return !!this.sim || this.tweens.length > 0; }

  setConfig(next) {
    const prev = this.cfg;
    this.cfg = { ...next };
    if (prev.dieStyle !== next.dieStyle) this.restyleDice();
    if (prev.coinStyle !== next.coinStyle) this.restyleCoins();
    if (prev.spinKind !== next.spinKind || !this.sectorsGroup) this.buildSectors(next.spinKind);
    const modeChanged = prev.mode !== next.mode;
    if (prev.couponBox !== next.couponBox) this.highlightCouponBox();
    if (modeChanged || prev.dieCount !== next.dieCount || prev.coinCount !== next.coinCount || prev.spinKind !== next.spinKind || prev.couponBox !== next.couponBox) {
      this.showMode();
      this.clearTags();
    }
    if (modeChanged) this.setCamPreset(next.mode, false);
    this.kick();
  }
  setFocus(b) { this.o.focus = b; this.kick(); }
  setReduced(b) { this.o.reduced = b; }
  setEventTest(fn) { this.evTest = fn; this.tags.forEach(t => t.el.classList.toggle('in', fn(t.key))); }
  clearTags() { this.o.tagLayer.innerHTML = ''; this.tags = []; this.kick(); }
  setQuality(t) { this.applyTier(t); }

  async act() {
    this.clearTags();
    const m = this.cfg.mode;
    if (m === 'cap') {
      const [val] = await this.throwPhysical();
      const key = String(val);
      this.setTags([{ obj: this.cap.mesh, dy: 0.6, key, html: key }]);
      return { key };
    }
    if (m === 'coupon') {
      const { key, obj } = await this.drawCouponAnim();
      this.setTags([{ obj, dy: 0.3, key, html: couponColor(key) }]);
      return { key };
    }
    if (m === 'dice' || m === 'coin') {
      const vals = await this.throwPhysical();
      const objs = this.activeThrowables();
      const key = m === 'dice' ? vals.join('-') : vals.join('');
      this.setTags(objs.map((ob, i) => ({
        obj: ob.mesh, dy: ob.kind === 'die' ? 0.85 : 0.6, key,
        html: ob.kind === 'die' && this.cfg.dieCount === 2 ? `<span class="sw" style="background:${DIE_SWATCH[i]}"></span>${vals[i]}` : String(vals[i])
      })));
      return { key };
    }
    if (m === 'cards') {
      const { key, obj } = await this.drawCardAnim();
      this.setTags([{ obj, dy: 0.35, key, html: cardRank(key) + cardSuit(key).sym }]);
      return { key };
    }
    if (m === 'spinner') {
      const key = await this.spinAnim();
      this.setTags([{ obj: this.wheel, dy: LabEngine.WHEEL_R + 0.85, key, html: key }]);
      return { key };
    }
    const { key, obj } = await this.drawBallAnim();
    this.setTags([{ obj, dy: 0.32, key, html: ballColor(key) }]);
    return { key };
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.clearTags();
    this.scene.traverse(obj => {
      const mesh = obj;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(m => { (m).map?.dispose(); m.dispose(); });
      }
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  /* ───────────── scene building ───────────── */
  tex(c, aniso = 4) {
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(aniso, this.maxAniso); return t;
  }

  buildEnvironment() {
    const [c, g] = canvas2d(4, 256);
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#A7D5EF'); gr.addColorStop(0.55, '#D6ECF7'); gr.addColorStop(1, '#EEF7F1');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    this.scene.background = this.tex(c, 1);
    this.scene.fog = new THREE.Fog(0xe2f0f3, 20, 48);

    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vP; void main(){ float y = vP.y; vec3 sky = mix(vec3(0.92,0.96,1.0), vec3(0.45,0.70,0.92), smoothstep(0.0,0.9,y)); vec3 gr = mix(vec3(0.75,0.85,0.72), vec3(0.30,0.48,0.28), smoothstep(0.0,-0.5,y)); gl_FragColor = vec4(y > 0.0 ? sky : gr, 1.0); }'
    })));
    const p1 = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 3.1, 2.7) }));
    p1.position.set(18, 22, 14); p1.lookAt(0, 0, 0); env.add(p1);
    const p2 = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.45, 1.7) }));
    p2.position.set(-20, 12, -8); p2.lookAt(0, 0, 0); env.add(p2);
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(env, 0.03).texture; pm.dispose();
    this.scene.environmentIntensity = 0.75;

    this.scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x8dbf88, 0.7));
    const sun = this.sun;
    sun.position.set(5, 11, 6); sun.castShadow = true;
    Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
    this.scene.add(sun);
  }

  buildPitch() {
    const res = TIERS[this.tier].ground;
    const [c, g] = canvas2d(res, res), S = res / 60, X = (x) => (x + 30) * S, Z = (z) => (z + 30) * S;
    for (let z = -30; z < 30; z += 2.5) { g.fillStyle = Math.floor((z + 100) / 2.5) % 2 ? '#93C68C' : '#A7D59E'; g.fillRect(0, Z(z), res, 2.5 * S + 1); }
    const R = seeded(3);
    for (let i = 0; i < (res * res) / 45; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,.09)' : 'rgba(40,90,40,.09)'; g.fillRect(R() * res, R() * res, 1.6, 1.6); }
    g.strokeStyle = 'rgba(255,255,255,.88)'; g.lineWidth = 0.11 * S; g.lineCap = 'round';
    g.beginPath(); g.moveTo(X(-30), Z(-0.6)); g.lineTo(X(30), Z(-0.6)); g.stroke();
    g.beginPath(); g.arc(X(0), Z(-0.6), 3.3 * S, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(X(0), Z(-0.6), 0.14 * S, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(X(-30), Z(-14)); g.lineTo(X(30), Z(-14)); g.stroke();
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: this.tex(c, 16), roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; this.scene.add(ground);
  }

  buildGrassMaterial() {
    this.grassMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uWind: { value: 1 }, uPress: { value: Array.from({ length: PRESS_N }, () => new THREE.Vector4()) } },
      vertexShader: `
        uniform float uTime; uniform float uWind; uniform vec4 uPress[${PRESS_N}];
        attribute float aShade;
        varying float vH; varying float vShade; varying float vStripe;
        void main(){
          vec4 base = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          float squash = 0.0;
          for (int i = 0; i < ${PRESS_N}; i++) {
            vec4 p = uPress[i];
            if (p.z > 0.0) { float d = distance(base.xz, p.xy); squash = max(squash, (1.0 - smoothstep(p.z * 0.55, p.z, d)) * p.w); }
          }
          vec3 pos = position;
          float h = uv.y;
          pos.y *= mix(1.0, 0.16, squash);
          vec4 world = modelMatrix * instanceMatrix * vec4(pos, 1.0);
          float w = sin(uTime * 1.7 + base.x * 0.55 + base.z * 0.35) * 0.6 + sin(uTime * 3.1 + base.x * 1.7 - base.z * 0.9) * 0.25;
          float bend = h * h * uWind * (1.0 - squash);
          world.x += w * bend * 0.16;
          world.z += (w * 0.5 + 0.35) * bend * 0.10;
          vH = h; vShade = aShade; vStripe = mod(floor((base.z + 100.0) / 2.5), 2.0);
          gl_Position = projectionMatrix * viewMatrix * world;
        }`,
      fragmentShader: `
        varying float vH; varying float vShade; varying float vStripe;
        void main(){
          vec3 baseA = vec3(0.47, 0.70, 0.44), tipA = vec3(0.72, 0.88, 0.64);
          vec3 baseB = vec3(0.41, 0.63, 0.39), tipB = vec3(0.64, 0.82, 0.57);
          vec3 c = mix(mix(baseA, baseB, vStripe), mix(tipA, tipB, vStripe), vH) * (0.9 + 0.2 * vShade);
          gl_FragColor = vec4(pow(c, vec3(2.2)) * 1.05, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    });
  }

  buildGrass(count) {
    if (this.grass) { this.scene.remove(this.grass); this.grass.geometry.dispose(); this.grass = null; }
    if (!count) return;
    const blade = new THREE.PlaneGeometry(0.07, 1, 1, 4); blade.translate(0, 0.5, 0);
    const p = blade.attributes.position;
    for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (1 - p.getY(i) * 0.85));
    const shade = new Float32Array(count);
    const mesh = new THREE.InstancedMesh(blade, this.grassMat, count);
    const R = seeded(7), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), s = new THREE.Vector3(), v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      v.set(-9 + R() * 18, 0, -7 + R() * 13.5);
      e.set((R() - 0.5) * 0.5, R() * Math.PI * 2, (R() - 0.5) * 0.3); q.setFromEuler(e);
      s.set(0.8 + R() * 0.6, 0.2 + R() * 0.22, 1);
      mesh.setMatrixAt(i, m.compose(v, q, s)); shade[i] = R();
    }
    blade.setAttribute('aShade', new THREE.InstancedBufferAttribute(shade, 1));
    mesh.frustumCulled = false; this.scene.add(mesh); this.grass = mesh;
  }

  buildPhysics() {
    const w = this.world;
    w.solver = new CANNON.GSSolver(); (w.solver).iterations = 12;
    const ground = new CANNON.Material('ground');
    w.addContactMaterial(new CANNON.ContactMaterial(ground, this.matObj, { friction: 0.42, restitution: 0.28 }));
    w.addContactMaterial(new CANNON.ContactMaterial(this.matObj, this.matObj, { friction: 0.3, restitution: 0.3 }));
    const add = (pos, axis, ang) => {
      const b = new CANNON.Body({ mass: 0, material: ground, shape: new CANNON.Plane() });
      b.position.set(...pos); b.quaternion.setFromAxisAngle(new CANNON.Vec3(...axis), ang); w.addBody(b);
    };
    add([0, 0, 0], [1, 0, 0], -Math.PI / 2);
    add([-4.2, 0, 0], [0, 1, 0], Math.PI / 2);
    add([4.2, 0, 0], [0, 1, 0], -Math.PI / 2);
    add([0, 0, -3.6], [0, 1, 0], 0);
    add([0, 0, 4.4], [0, 1, 0], Math.PI);
  }

  /** Kubus bersudut membulat; UV disebar ulang agar gambar sisi tidak menyempit */
  static roundedCube(r = 0.13, s = 4) {
    const N = 2 * s + 1, g = new THREE.BoxGeometry(1, 1, 1, N, N, N);
    const P = g.attributes.position, NN = g.attributes.normal, UV = g.attributes.uv;
    const inner = 0.5 - r, ext = inner + r * Math.SQRT1_2;
    const t = [0, 0, 0], d = [0, 0, 0], c = [0, 0, 0], f = [0, 0, 0];
    const UVAX = [[2, 1], [0, 2], [0, 1]];
    for (let i = 0; i < P.count; i++) {
      const F = Math.abs(NN.getX(i)) > 0.5 ? 0 : Math.abs(NN.getY(i)) > 0.5 ? 1 : 2;
      t[0] = P.getX(i) * N; t[1] = P.getY(i) * N; t[2] = P.getZ(i) * N;
      for (let k = 0; k < 3; k++) {
        const a = Math.abs(t[k]);
        if (a < 0.5) { c[k] = (t[k] / 0.5) * inner; d[k] = 0; }
        else { c[k] = Math.sign(t[k]) * inner; d[k] = Math.sign(t[k]) * Math.tan(((a - 0.5) / s) * (Math.PI / 4)); }
      }
      const len = Math.hypot(d[0], d[1], d[2]);
      for (let k = 0; k < 3; k++) f[k] = c[k] + (d[k] / len) * r;
      P.setXYZ(i, f[0], f[1], f[2]); NN.setXYZ(i, d[0] / len, d[1] / len, d[2] / len);
      const [ua, va] = UVAX[F], u0 = UV.getX(i), v0 = UV.getY(i);
      const su = Math.sign(u0 - 0.5) === Math.sign(t[ua]) ? 1 : -1, sv = Math.sign(v0 - 0.5) === Math.sign(t[va]) ? 1 : -1;
      UV.setXY(i, 0.5 + (0.5 * su * f[ua]) / ext, 0.5 + (0.5 * sv * f[va]) / ext);
    }
    return g;
  }

  dieFaceCanvas(v, style, tint, seed) {
    const [c, g] = canvas2d(256, 256);
    g.fillStyle = tint; g.fillRect(0, 0, 256, 256);
    if (style === 'kayu') {
      const R = seeded(seed + v * 31);
      for (let i = 0; i < 44; i++) {
        g.strokeStyle = `rgba(118,68,30,${0.05 + R() * 0.12})`; g.lineWidth = 1 + R() * 3;
        const y0 = R() * 256, amp = 3 + R() * 7, ph = R() * 6; g.beginPath(); g.moveTo(0, y0);
        for (let x = 0; x <= 256; x += 12) g.lineTo(x, y0 + Math.sin(x * 0.025 + ph) * amp);
        g.stroke();
      }
    }
    if (style === 'jeli') {
      const gr = g.createRadialGradient(80, 70, 8, 128, 128, 190);
      gr.addColorStop(0, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    }
    if (style === 'angka') {
      g.fillStyle = '#2E3440'; g.font = `800 150px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(v), 128, 138);
      return c;
    }
    const pip = style === 'jeli' ? '#FFFFFF' : style === 'kayu' ? '#5A361C' : v === 1 ? '#D9506A' : '#2E3440';
    const L = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 3, 6, 2, 5, 8] };
    for (const k of L[v]) {
      const x = 64 + (k % 3) * 64, y = 64 + Math.floor(k / 3) * 64, rad = v === 1 ? 31 : 22;
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(x + 2, y + 2.5, rad, 0, Math.PI * 2); g.fill();
      g.fillStyle = pip; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(x - 3, y - 3, rad * 0.75, 0, Math.PI * 2); g.fill();
    }
    return c;
  }

  dieMaterials(style, idx) {
    const tint = DIE_TINT[style][idx];
    return LabEngine.FACE_VALUES.map(v => {
      const map = this.tex(this.dieFaceCanvas(v, style, tint, idx * 97));
      if (style === 'jeli')
        return this.tier === 'tinggi'
          ? new THREE.MeshPhysicalMaterial({ map, transmission: 0.6, thickness: 0.8, roughness: 0.12, ior: 1.35, clearcoat: 1, clearcoatRoughness: 0.08 })
          : new THREE.MeshPhysicalMaterial({ map, transparent: true, opacity: 0.9, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08 });
      if (style === 'kayu') return new THREE.MeshStandardMaterial({ map, roughness: 0.78 });
      return new THREE.MeshPhysicalMaterial({ map, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.2 });
    });
  }

  emboss(g, relief, draw) {
    g.save(); g.translate(-3, -3); g.fillStyle = 'rgba(255,255,255,.55)'; g.strokeStyle = g.fillStyle; draw(); g.restore();
    g.save(); g.translate(3, 3); g.fillStyle = relief + '.45)'; g.strokeStyle = g.fillStyle; draw(); g.restore();
    g.save(); g.fillStyle = relief + '.75)'; g.strokeStyle = g.fillStyle; draw(); g.restore();
  }

  coinFaceCanvas(styleKey, side) {
    const st = COIN_STYLES[styleKey], [c, g] = canvas2d(512, 512);
    const gr = g.createRadialGradient(200, 180, 30, 256, 256, 280); gr.addColorStop(0, st.a); gr.addColorStop(1, st.b);
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    g.lineWidth = 20; g.strokeStyle = st.edge; g.beginPath(); g.arc(256, 256, 244, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2; g.fillStyle = st.relief + '.35)';
      g.beginPath(); g.arc(256 + Math.cos(a) * 208, 256 + Math.sin(a) * 208, 4, 0, Math.PI * 2); g.fill();
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const font = (w, px) => `${w} ${px}px ${FONT}`;
    if (st.sym === 'letter') {
      this.emboss(g, st.relief, () => { g.font = font(800, 250); g.fillText(side, 256, 238); g.font = font(700, 42); g.fillText(side === 'A' ? 'ANGKA' : 'GAMBAR', 256, 380); });
      return c;
    }
    if (side === 'A') {
      this.emboss(g, st.relief, () => { g.font = font(800, 230); g.fillText('1', 256, 236); g.font = font(700, 34); g.fillText('A', 256, 392); });
    } else {
      this.emboss(g, st.relief, () => {
        g.beginPath();
        if (st.sym === 'star') {
          for (let i = 0; i < 10; i++) { const r = i % 2 ? 62 : 140, a = -Math.PI / 2 + (i * Math.PI) / 5; g.lineTo(256 + Math.cos(a) * r, 240 + Math.sin(a) * r); }
          g.closePath(); g.fill();
        }
        if (st.sym === 'leaf') {
          g.moveTo(256, 100); g.bezierCurveTo(370, 170, 360, 320, 256, 380); g.bezierCurveTo(152, 320, 142, 170, 256, 100); g.fill();
          g.lineWidth = 8; g.strokeStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(256, 130); g.lineTo(256, 360); g.stroke();
        }
        if (st.sym === 'house') {
          g.moveTo(130, 230); g.lineTo(256, 110); g.lineTo(382, 230); g.closePath(); g.fill(); g.fillRect(160, 230, 192, 130);
          g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(232, 290, 48, 70);
        }
        g.font = font(700, 34); g.fillStyle = st.relief + '.75)'; g.fillText('G', 256, 412);
      });
    }
    return c;
  }

  coinMaterials(styleKey) {
    const st = COIN_STYLES[styleKey];
    const [ec, eg] = canvas2d(512, 32);
    eg.fillStyle = st.edge; eg.fillRect(0, 0, 512, 32);
    if (styleKey !== 'jumbo') for (let x = 0; x < 512; x += 6) { eg.fillStyle = st.relief + '.25)'; eg.fillRect(x, 0, 2, 32); }
    const mk = (c) => new THREE.MeshStandardMaterial({ map: this.tex(c, 16), metalness: st.metal, roughness: st.rough });
    return [mk(ec), mk(this.coinFaceCanvas(styleKey, 'A')), mk(this.coinFaceCanvas(styleKey, 'G'))]; // sisi, atas = Angka, bawah = Gambar
  }

  buildThrowables() {
    this.dice = [0, 1].map(i => {
      const mesh = new THREE.Mesh(this.dieGeo, this.dieMaterials(this.cfg.dieStyle, i));
      mesh.castShadow = true;
      const body = new CANNON.Body({ mass: 1, material: this.matObj, shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)), linearDamping: 0.08, angularDamping: 0.12 });
      return { mesh, body, kind: 'die', i };
    });
    this.coins = [0, 1].map(i => {
      const mesh = new THREE.Mesh(this.coinGeo, this.coinMaterials(this.cfg.coinStyle));
      mesh.castShadow = true;
      const body = new CANNON.Body({ mass: 0.4, material: this.matObj, shape: new CANNON.Cylinder(0.75, 0.75, 0.11, 20), linearDamping: 0.08, angularDamping: 0.25 });
      return { mesh, body, kind: 'coin', i };
    });
  }
  disposeMats(obj) {
    ((obj).material).forEach(m => { (m).map?.dispose(); m.dispose(); });
  }
  restyleDice() { this.dice.forEach(d => { this.disposeMats(d.mesh); (d.mesh).material = this.dieMaterials(this.cfg.dieStyle, d.i); }); }
  restyleCoins() { this.coins.forEach(c => { this.disposeMats(c.mesh); (c.mesh).material = this.coinMaterials(this.cfg.coinStyle); }); }

  /* ── tutup botol: titik berat dekat bagian tertutup → peluangnya TIDAK 1/2 dan tidak bisa dihitung dengan rumus ── */
  static makeCapBody(mat) {
    const b = new CANNON.Body({ mass: 0.3, material: mat, linearDamping: 0.1, angularDamping: 0.3 });
    b.addShape(new CANNON.Cylinder(0.55, 0.55, 0.06, 16), new CANNON.Vec3(0, 0, 0));       // bagian atas tertutup (berat)
    for (let i = 0; i < 10; i++) {                                                          // rok bergerigi, ringan & berongga
      const a = (i / 10) * Math.PI * 2, q = new CANNON.Quaternion(); q.setFromEuler(0, -a, 0);
      b.addShape(new CANNON.Box(new CANNON.Vec3(0.03, 0.16, 0.17)), new CANNON.Vec3(Math.cos(a) * 0.53, -0.17, Math.sin(a) * 0.53), q);
    }
    return b;
  }
  buildCap() {
    const grp = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0xf2a0a8, metalness: 0.75, roughness: 0.32, side: THREE.DoubleSide });
    const [c, g] = canvas2d(512, 32); g.fillStyle = '#F2A0A8'; g.fillRect(0, 0, 512, 32);
    for (let x = 0; x < 512; x += 12) { g.fillStyle = 'rgba(120,40,50,.28)'; g.fillRect(x, 0, 5, 32); }
    const skirtMat = new THREE.MeshStandardMaterial({ map: this.tex(c), metalness: 0.75, roughness: 0.35, side: THREE.DoubleSide });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 40), metal);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.6, 0.32, 40, 1, true), skirtMat); skirt.position.y = -0.17;
    const liner = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), new THREE.MeshStandardMaterial({ color: 0xfff4e0, roughness: 0.8 }));
    liner.rotation.x = Math.PI / 2; liner.position.y = -0.035;
    [top, skirt].forEach(m => { m.castShadow = true; }); grp.add(top, skirt, liner);
    this.cap = { mesh: grp, body: LabEngine.makeCapBody(this.matObj), kind: 'cap', i: 0 };
  }
  readCap(o) {
    const y = new THREE.Vector3(0, 1, 0).applyQuaternion(this.bodyQ(o)).y;
    // sumbu +y = bagian tertutup. Tertutup di atas → rongga menghadap tanah → telungkup
    return { val: (y > 0 ? 'telungkup' : 'telentang'), flat: Math.abs(y) > 0.8 };
  }
  static launchCap(b) {
    const e = new CANNON.Quaternion(); e.setFromEuler(rand() * 0.6, rand() * 6.28, rand() * 0.6);
    b.position.set((rand() - 0.5) * 0.6, 0.9, 2.6); b.quaternion.copy(e);
    b.velocity.set((rand() - 0.5) * 1.4, 9 + rand() * 2, -(2.3 + rand() * 1.2));
    b.angularVelocity.set((rand() - 0.5) * 40, (rand() - 0.5) * 8, (rand() - 0.5) * 40);
    b.wakeUp();
  }
  /** Mode cepat tutup botol: simulasi fisika tanpa gambar (tidak ada rumus yang bisa dipakai) */
  async simulateCaps(n, onProgress) {
    if (!this.capWorld) {
      const w = new CANNON.World({ gravity: new CANNON.Vec3(0, -28, 0) });
      const ground = new CANNON.Material('g');
      w.addContactMaterial(new CANNON.ContactMaterial(ground, this.matObj, { friction: 0.42, restitution: 0.28 }));
      const plane = new CANNON.Body({ mass: 0, material: ground, shape: new CANNON.Plane() });
      plane.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); w.addBody(plane);
      const body = LabEngine.makeCapBody(this.matObj); w.addBody(body);
      this.capWorld = { world: w, body };
    }
    const { world, body } = this.capWorld, out = [], q = new THREE.Quaternion(), up = new THREE.Vector3();
    while (out.length < n && !this.disposed) {
      LabEngine.launchCap(body);
      let still = 0;
      for (let s = 0; s < 480 && still < 20; s++) {
        world.step(1 / 60);
        still = body.velocity.length() < 0.07 && body.angularVelocity.length() < 0.14 ? still + 1 : 0;
      }
      q.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
      const y = up.set(0, 1, 0).applyQuaternion(q).y;
      if (Math.abs(y) > 0.8) out.push(y > 0 ? 'telungkup' : 'telentang'); // mendarat miring → lempar ulang (tidak dihitung)
      if (out.length % 10 === 0) { onProgress?.(out.length); await new Promise(r => setTimeout(r, 0)); }
    }
    return out;
  }

  /* ── kotak undian kupon A & B (transparan) ── */
  buildCoupons() {
    this.scene.add(this.couponGroup);
    (['A', 'B']).forEach((box, bi) => {
      const x = bi ? 1.35 : -1.35;
      const glass = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.9, 0.95), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, roughness: 0.05, clearcoat: 1, depthWrite: false }));
      glass.position.set(x, 0.45, 0); this.couponGroup.add(glass);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(glass.geometry), new THREE.LineBasicMaterial({ color: 0xffffff }));
      edges.position.copy(glass.position); this.couponGroup.add(edges);
      const R = seeded(bi * 17 + 5);
      couponKeys(box).forEach((k, i) => {
        const cpn = new THREE.Mesh(this.couponGeo, new THREE.MeshStandardMaterial({ color: COUPON_COL[couponColor(k)], roughness: 0.6 }));
        cpn.position.set(x + (R() - 0.5) * 0.9, 0.04 + i * 0.03, (R() - 0.5) * 0.6); cpn.rotation.y = R() * Math.PI;
        this.couponGroup.add(cpn);
      });
      const [c, g] = canvas2d(128, 128);
      g.fillStyle = '#2E3440'; g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.font = `800 80px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(box, 64, 70);
      const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: this.tex(c), transparent: true, toneMapped: false }));
      lbl.position.set(x, 1.2, 0.2); this.couponGroup.add(lbl);
      this.couponBoxes[box] = { glass, x };
    });
    this.highlightCouponBox();
  }
  highlightCouponBox() {
    (['A', 'B']).forEach(b => {
      const m = this.couponBoxes[b]?.glass.material;
      if (!m) return;
      const on = (this.cfg.couponBox ?? 'A') === b;
      m.color.set(on ? 0xcfe0ff : 0xffffff); m.opacity = on ? 0.38 : 0.18;
    });
    this.kick();
  }
  static couponSlot(i) { return new THREE.Vector3(-1.1 + i * 0.45, 0.06, 1.35); }
  async drawCouponAnim() {
    const box = this.cfg.couponBox ?? 'A', keys = couponKeys(box), key = keys[randomInt(keys.length)], x = this.couponBoxes[box].x;
    if (this.trayCoupons.length >= 6) {
      const old = this.trayCoupons.shift(); this.couponGroup.remove(old); (old.material).dispose();
      const from = this.trayCoupons.map(b => b.position.clone());
      await this.tween(0.2, k => this.trayCoupons.forEach((b, i) => b.position.lerpVectors(from[i], LabEngine.couponSlot(i), k)));
    }
    const cpn = new THREE.Mesh(this.couponGeo, new THREE.MeshStandardMaterial({ color: COUPON_COL[couponColor(key)], roughness: 0.6 }));
    cpn.castShadow = true; cpn.scale.setScalar(1.3);
    const start = new THREE.Vector3(x, 0.3, 0), up = new THREE.Vector3(x, 1.7, 0.3), slot = LabEngine.couponSlot(this.trayCoupons.length);
    cpn.position.copy(start); this.couponGroup.add(cpn); this.trayCoupons.push(cpn);
    await this.tween(0.55, k => { cpn.position.lerpVectors(start, up, k); cpn.rotation.x = k * Math.PI * 2; }, easeOut);
    await this.tween(0.6, k => { cpn.position.lerpVectors(up, slot, k); cpn.position.y += Math.sin(k * Math.PI) * 0.4; cpn.rotation.z = k * Math.PI; });
    return { key, obj: cpn };
  }

  cardFaceCanvas(key) {
    const rank = cardRank(key), s = cardSuit(key), col = s.red ? '#D04B66' : '#2E3440';
    const [c, g] = canvas2d(256, 372);
    roundRect(g, 0, 0, 256, 372, 22); g.fillStyle = '#FFFDF8'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#E3DACB'; g.stroke();
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
    const corner = () => { g.font = `800 40px ${FONT}`; g.fillText(rank, 34, 40); g.font = '32px serif'; g.fillText(s.sym, 34, 80); };
    corner(); g.save(); g.translate(256, 372); g.rotate(Math.PI); corner(); g.restore();
    if (['J', 'Q', 'K'].includes(rank)) {
      g.fillStyle = s.red ? '#FBE0E6' : '#E6E9F2'; roundRect(g, 64, 96, 128, 180, 18); g.fill();
      g.fillStyle = col; g.font = `800 92px ${FONT}`; g.fillText(rank, 128, 170);
      g.font = '44px serif'; g.fillText(s.sym, 128, 238);
    } else { g.font = (rank === 'A' ? 150 : 112) + 'px serif'; g.fillText(s.sym, 128, 192); }
    return c;
  }

  buildCards() {
    const [c, g] = canvas2d(256, 372);
    roundRect(g, 0, 0, 256, 372, 22); g.fillStyle = '#FFFFFF'; g.fill();
    roundRect(g, 12, 12, 232, 348, 14); g.fillStyle = '#C9B9F2'; g.fill();
    g.save(); roundRect(g, 12, 12, 232, 348, 14); g.clip();
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 3;
    for (let i = -400; i < 400; i += 26) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 372, 372); g.stroke(); g.beginPath(); g.moveTo(i + 372, 0); g.lineTo(i, 372); g.stroke(); }
    g.restore();
    g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(128, 186, 36, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#9C86DB'; g.font = `800 34px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 128, 188);
    this.cardBackTex = this.tex(c, 16);

    this.scene.add(this.cardsGroup);
    this.deck.position.copy(LabEngine.DECK_POS); this.cardsGroup.add(this.deck);
    const [sc, sg] = canvas2d(64, 64); sg.fillStyle = '#F6F2EA'; sg.fillRect(0, 0, 64, 64); sg.fillStyle = '#E0D7C8'; for (let y = 0; y < 64; y += 4) sg.fillRect(0, y, 64, 1);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.24, 1.28), new THREE.MeshStandardMaterial({ map: this.tex(sc, 1), roughness: 0.8 }));
    body.position.y = 0.12; body.castShadow = true; this.deck.add(body);
    const top = new THREE.Mesh(this.cardPlane, new THREE.MeshStandardMaterial({ map: this.cardBackTex, roughness: 0.6, alphaTest: 0.5 }));
    top.rotation.x = -Math.PI / 2; top.position.y = 0.245; this.deck.add(top);
  }

  makeCard(key) {
    const grp = new THREE.Group();
    const front = new THREE.Mesh(this.cardPlane, new THREE.MeshStandardMaterial({ map: this.tex(this.cardFaceCanvas(key), 16), roughness: 0.6, alphaTest: 0.5 }));
    front.rotation.x = -Math.PI / 2; front.position.y = 0.004;
    const back = new THREE.Mesh(this.cardPlane, new THREE.MeshStandardMaterial({ map: this.cardBackTex, roughness: 0.6, alphaTest: 0.5 }));
    back.rotation.x = Math.PI / 2; back.position.y = -0.004;
    front.castShadow = back.castShadow = true; grp.add(front, back);
    return grp;
  }
  static cardSlot(i) { return new THREE.Vector3(-0.35 + i * 0.62, 0.075 + i * 0.004, 0.55); }

  buildSpinner() {
    const Y = LabEngine.WHEEL_Y, R = LabEngine.WHEEL_R;
    this.scene.add(this.spinnerGroup);
    this.wheel.position.set(0, Y, 0); this.spinnerGroup.add(this.wheel);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.1, R + 0.1, 0.12, 72), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
    plate.rotation.x = Math.PI / 2; plate.castShadow = true; this.wheel.add(plate);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R + 0.1, 0.06, 12, 96), new THREE.MeshStandardMaterial({ color: 0xffc9a3, roughness: 0.4 }));
    rim.position.z = 0.02; this.wheel.add(rim);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.26, 32), new THREE.MeshPhysicalMaterial({ color: 0xcdbef3, roughness: 0.3, clearcoat: 1 }));
    hub.rotation.x = Math.PI / 2; hub.position.z = 0.1; this.wheel.add(hub);
    const metal = new THREE.MeshStandardMaterial({ color: 0xe8ebf0, metalness: 0.7, roughness: 0.35 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, Y, 16), metal); pole.position.set(0, Y / 2, -0.16); pole.castShadow = true; this.spinnerGroup.add(pole);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.1, 32), metal); foot.position.set(0, 0.05, -0.16); foot.castShadow = true; this.spinnerGroup.add(foot);
    const ptr = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.45, 24), new THREE.MeshPhysicalMaterial({ color: 0x2e3440, roughness: 0.3, clearcoat: 0.6 }));
    ptr.rotation.z = Math.PI; ptr.position.set(0, Y + R + 0.3, 0.14); ptr.castShadow = true; this.spinnerGroup.add(ptr);
  }

  buildSectors(kind) {
    const R = LabEngine.WHEEL_R;
    if (this.sectorsGroup) {
      this.wheel.remove(this.sectorsGroup);
      this.sectorsGroup.traverse(o => { const m = o; if (m.isMesh) { m.geometry.dispose(); const mat = m.material; mat.map?.dispose(); mat.dispose(); } });
    }
    const grp = new THREE.Group(); grp.position.z = 0.066; this.wheel.add(grp); this.sectorsGroup = grp;
    const defs = SPIN[kind], tot = defs.reduce((a, b) => a + b.w, 0);
    let start = 0; this.sectorDefs = [];
    for (const d of defs) {
      const len = (d.w / tot) * Math.PI * 2;
      grp.add(new THREE.Mesh(new THREE.CircleGeometry(R, 48, start + 0.012, len - 0.024), new THREE.MeshStandardMaterial({ color: d.col, roughness: 0.55 })));
      const [c, g] = canvas2d(256, 96);
      g.fillStyle = '#2E3440'; g.font = `800 46px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(d.c, 128, 36);
      if (kind === 'beda') { g.font = '700 30px "JetBrains Mono", monospace'; const k = gcd(d.w, tot); g.fillText(`${d.w / k}/${tot / k}`, 128, 78); }
      const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.34), new THREE.MeshBasicMaterial({ map: this.tex(c), transparent: true, toneMapped: false }));
      const mid = start + len / 2, small = d.w / tot < 0.2, rr = small ? 1.05 : 0.95;
      lbl.position.set(Math.cos(mid) * rr, Math.sin(mid) * rr, 0.005); lbl.rotation.z = mid - Math.PI / 2;
      if (small) lbl.scale.setScalar(0.72);
      grp.add(lbl);
      this.sectorDefs.push({ c: d.c, start, len }); start += len;
    }
  }

  ballMat(col) { return new THREE.MeshPhysicalMaterial({ color: BALL_COL[col], roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }); }

  buildBag() {
    const B = LabEngine.BAG_POS;
    this.scene.add(this.bagGroup);
    const [c, g] = canvas2d(128, 128); g.fillStyle = '#CDBEF3'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(255,255,255,.22)'; for (let i = 0; i < 128; i += 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); }
    g.strokeStyle = 'rgba(80,60,140,.10)'; for (let i = 0; i < 128; i += 4) { g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); }
    const t = this.tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 3);
    const pts = [[0, 0], [0.7, 0.02], [0.95, 0.25], [1.02, 0.6], [0.92, 0.95], [0.62, 1.2], [0.42, 1.34], [0.5, 1.48], [0.58, 1.53]].map(p => new THREE.Vector2(p[0], p[1]));
    const bag = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, side: THREE.DoubleSide }));
    bag.castShadow = true; bag.position.copy(B); this.bagGroup.add(bag);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.045, 10, 40), new THREE.MeshStandardMaterial({ color: 0xffb98e, roughness: 0.6 }));
    tie.rotation.x = Math.PI / 2; tie.position.set(B.x, 1.34, B.z); this.bagGroup.add(tie);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.47, 32), new THREE.MeshBasicMaterial({ color: 0x5e4e8c }));
    hole.rotation.x = -Math.PI / 2; hole.position.set(B.x, 1.45, B.z); this.bagGroup.add(hole);
    ([['merah', -0.15, 0.05], ['kuning', 0.13, -0.08], ['hijau', 0.02, 0.16]]).forEach(([col, x, z]) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), this.ballMat(col)); b.position.set(B.x + x, 1.47, B.z + z); this.bagGroup.add(b);
    });
  }
  static traySlot(i) { return new THREE.Vector3(0.35 + i * 0.46, 0.18, 0.95); }

  /* ───────────── tier, camera, input ───────────── */
  applyTier(t) {
    this.tier = t;
    const T = TIERS[t];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, T.dpr));
    this.sun.shadow.mapSize.set(T.shadow, T.shadow);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); (this.sun.shadow).map = null; }
    this.buildGrass(T.grass);
    if (this.cfg.dieStyle === 'jeli') this.restyleDice();
    this.resize();
  }

  setCamPreset(mode, instant) {
    const p = LabEngine.PRESETS[mode], c = this.cam;
    c.fromPos.copy(c.pos); c.fromTarget.copy(c.target);
    c.toPos.set(...p.pos); c.toTarget.set(...p.target); c.az = 0;
    c.k = instant ? 1 : 0;
    if (instant) { c.pos.copy(c.toPos); c.target.copy(c.toTarget); }
    this.kick();
  }
  applyCamera() {
    const c = this.cam, v = new THREE.Vector3().copy(c.pos).sub(c.target).multiplyScalar(c.dist).applyAxisAngle(THREE.Object3D.DEFAULT_UP, c.az);
    this.camera.position.copy(c.target).add(v); this.camera.lookAt(c.target);
  }
  bindPointer() {
    const cv = this.o.canvas;
    cv.addEventListener('pointerdown', e => {
      this.drag = { x: e.clientX, az: this.cam.az }; cv.setPointerCapture(e.pointerId);
      const now = performance.now(); if (now - this.lastTap < 300) { this.cam.az = 0; this.kick(); } this.lastTap = now;
    });
    cv.addEventListener('pointermove', e => {
      if (!this.drag) return;
      this.cam.az = THREE.MathUtils.clamp(this.drag.az - (e.clientX - this.drag.x) * 0.006, -0.6, 0.6); this.kick();
    });
    const end = () => { this.drag = null; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  }
  resize() {
    const w = this.o.container.clientWidth, h = this.o.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = this.camera.aspect < 1 ? 50 : 42;
    this.cam.dist = this.camera.aspect < 0.8 ? 1.25 : this.camera.aspect < 1 ? 1.1 : 1;
    this.camera.updateProjectionMatrix(); this.kick();
  }
  kick() { this.needsRender = true; }

  /* ───────────── loop ───────────── */
  tween(dur, fn, ease = easeInOut) {
    return new Promise(res => {
      if (this.o.reduced) { fn(1); res(); return; }
      this.tweens.push({ t: 0, dur, fn, ease, res }); this.kick();
    });
  }
  setTags(list) {
    this.o.tagLayer.innerHTML = '';
    this.tags = list.map(t => {
      const el = document.createElement('div');
      el.className = 'tag' + (this.evTest(t.key) ? ' in' : '');
      el.innerHTML = t.html; this.o.tagLayer.appendChild(el);
      return { obj: t.obj, dy: t.dy, el, key: t.key };
    });
    this.kick();
  }
  updateTags() {
    const w = this.o.container.clientWidth, h = this.o.container.clientHeight, p = new THREE.Vector3();
    for (const t of this.tags) {
      t.obj.getWorldPosition(p); p.y += t.dy; p.project(this.camera);
      t.el.style.left = (p.x * 0.5 + 0.5) * w + 'px'; t.el.style.top = (-p.y * 0.5 + 0.5) * h + 'px';
    }
  }
  updatePresses() {
    const U = this.grassMat.uniforms.uPress.value;
    let i = 0;
    const put = (x, z, r) => { if (i < PRESS_N) U[i++].set(x, z, r, 1); };
    const m = this.cfg.mode;
    if (m === 'dice') this.dice.slice(0, this.cfg.dieCount).forEach(d => { if (d.mesh.position.y < 1.2) put(d.mesh.position.x, d.mesh.position.z, 0.95); });
    if (m === 'coin') this.coins.slice(0, this.cfg.coinCount).forEach(c => { if (c.mesh.position.y < 1) put(c.mesh.position.x, c.mesh.position.z, 1.05); });
    if (m === 'cards') { put(LabEngine.DECK_POS.x, LabEngine.DECK_POS.z, 1.05); put(0.9, 0.55, 2.0); put(-0.1, 0.55, 1.4); }
    if (m === 'spinner') put(0, -0.16, 1.0);
    if (m === 'bag') { put(LabEngine.BAG_POS.x, LabEngine.BAG_POS.z, 1.35); put(1.5, 0.95, 1.8); put(0.5, 0.95, 1.2); }
    if (m === 'coupon') { put(-1.35, 0, 1.1); put(1.35, 0, 1.1); put(0, 1.35, 1.9); }
    if (m === 'cap' && this.cap.mesh.position.y < 1) put(this.cap.mesh.position.x, this.cap.mesh.position.z, 0.95);
    for (; i < PRESS_N; i++) U[i].set(0, 0, 0, 0);
  }

  frame = (now) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    if (document.hidden) { this.last = now; return; }
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    let active = false;
    if (this.sim) { active = true; this.stepSim(dt); }
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i]; tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(tw.ease(k));
      if (k >= 1) { this.tweens.splice(i, 1); tw.res(); }
      active = true;
    }
    const c = this.cam;
    if (c.k < 1) { c.k = Math.min(1, c.k + dt / 0.7); const e = easeInOut(c.k); c.pos.lerpVectors(c.fromPos, c.toPos, e); c.target.lerpVectors(c.fromTarget, c.toTarget, e); active = true; }
    const wind = !this.o.focus && !!this.grass;
    if (!active && !wind && !this.needsRender && !this.drag) return;
    if (wind) this.grassMat.uniforms.uTime.value += dt;
    this.applyCamera(); this.updatePresses(); this.updateTags();
    this.renderer.render(this.scene, this.camera); this.needsRender = false;
    if (!this.fps.checked && this.o.autoQuality) {
      this.fps.t += dt; this.fps.n++;
      if (this.fps.t > 4) {
        this.fps.checked = true;
        if (this.fps.n / this.fps.t < 28 && this.tier !== 'hemat') {
          const t = this.tier === 'tinggi' ? 'sedang' : 'hemat';
          this.applyTier(t); this.o.onAutoDowngrade?.(t);
        }
      }
    }
  };

  /* ───────────── physics throws ───────────── */
  activeThrowables() {
    if (this.cfg.mode === 'cap') return [this.cap];
    return this.cfg.mode === 'dice' ? this.dice.slice(0, this.cfg.dieCount) : this.coins.slice(0, this.cfg.coinCount);
  }
  sync(o) { o.mesh.position.set(o.body.position.x, o.body.position.y, o.body.position.z); o.mesh.quaternion.set(o.body.quaternion.x, o.body.quaternion.y, o.body.quaternion.z, o.body.quaternion.w); }
  bodyQ(o) { const q = o.body.quaternion; return new THREE.Quaternion(q.x, q.y, q.z, q.w); }
  readDie(o) {
    const q = this.bodyQ(o); let best = -2, val = 1;
    LabEngine.FACE_N.forEach((n, i) => { const y = n.clone().applyQuaternion(q).y; if (y > best) { best = y; val = LabEngine.FACE_VALUES[i]; } });
    return { val: val, flat: best > 0.9 };
  }
  readCoin(o) {
    const y = new THREE.Vector3(0, 1, 0).applyQuaternion(this.bodyQ(o)).y;
    return { val: (y > 0 ? 'A' : 'G'), flat: Math.abs(y) > 0.85 };
  }
  stepSim(dt) {
    const sim = this.sim;
    this.world.step(1 / 90, dt, 6);
    sim.objs.forEach(o => this.sync(o)); sim.time += dt;
    const still = sim.objs.every(o => o.body.velocity.length() < 0.07 && o.body.angularVelocity.length() < 0.14);
    sim.still = still ? sim.still + dt : 0;
    if (sim.still > 0.35 || sim.time > 6) {
      const reads = sim.objs.map(o => (o.kind === 'die' ? this.readDie(o) : o.kind === 'cap' ? this.readCap(o) : this.readCoin(o)));
      const tilted = sim.objs.filter((_, i) => !reads[i].flat);
      if (tilted.length && sim.nudges < 4) {
        sim.nudges++; sim.still = 0;
        tilted.forEach(o => { o.body.velocity.set((rand() - 0.5) * 1.5, 3.5, (rand() - 0.5) * 1.5); o.body.angularVelocity.set((rand() - 0.5) * 12, (rand() - 0.5) * 12, (rand() - 0.5) * 12); });
        return;
      }
      const done = sim.resolve; this.sim = null; done(reads.map(r => r.val));
    }
  }
  async throwPhysical() {
    const objs = this.activeThrowables();
    objs.forEach(o => { if (!this.world.bodies.includes(o.body)) this.world.addBody(o.body); });
    if (this.o.reduced && this.cfg.mode === 'cap') {
      // tanpa rumus: hasil diambil dari simulasi fisika tersembunyi, lalu tutup diletakkan sesuai hasil
      const [r] = await this.simulateCaps(1);
      const b = this.cap.body; b.velocity.setZero(); b.angularVelocity.setZero();
      b.position.set(0, r === 'telungkup' ? 0.32 : 0.03, 0.4);
      b.quaternion.setFromEuler(r === 'telungkup' ? 0 : Math.PI, rand() * 6.28, 0);
      this.sync(this.cap); this.kick();
      return [r];
    }
    if (this.o.reduced) return this.placeDirect(objs);
    const e = new CANNON.Quaternion();
    objs.forEach((o, i) => {
      const b = o.body;
      if (o.kind === 'cap') { LabEngine.launchCap(b); this.sync(o); return; }
      if (o.kind === 'die') {
        b.position.set(-3.1 + i * 1.15, 2.2 + rand() * 0.6, 3.3 + rand() * 0.4);
        e.setFromEuler(rand() * 6.28, rand() * 6.28, rand() * 6.28); b.quaternion.copy(e);
        b.velocity.set(4.3 + rand() * 2.4, 1.5 + rand() * 2, -(6.4 + rand() * 2.4));
        b.angularVelocity.set((rand() - 0.5) * 30, (rand() - 0.5) * 30, (rand() - 0.5) * 30);
      } else {
        const x = objs.length === 1 ? 0 : i ? 0.85 : -0.85;
        b.position.set(x, 0.9, 2.6);
        e.setFromEuler(0, rand() * 6.28, 0); b.quaternion.copy(e);
        b.velocity.set((rand() - 0.5) * 1.4, 10.5 + rand() * 2.5, -(2.3 + rand() * 1.2));
        const spin = (rand() < 0.5 ? -1 : 1) * (28 + rand() * 14);
        b.angularVelocity.set(spin, (rand() - 0.5) * 4, (rand() - 0.5) * 6);
      }
      b.wakeUp(); this.sync(o);
    });
    return new Promise(res => { this.sim = { objs, time: 0, still: 0, nudges: 0, resolve: res }; this.kick(); });
  }
  /** Kurangi gerakan: hasil dari RNG kriptografis, benda langsung ditaruh menunjukkan sisi itu */
  placeDirect(objs) {
    const UP = new THREE.Vector3(0, 1, 0);
    return objs.map((o, i) => {
      const b = o.body, yaw = new THREE.Quaternion().setFromAxisAngle(UP, rand() * 6.28);
      const x = objs.length === 1 ? 0 : i ? 1 : -1;
      b.velocity.setZero(); b.angularVelocity.setZero();
      if (o.kind === 'die') {
        const fi = randomInt(6), q = new THREE.Quaternion().setFromUnitVectors(LabEngine.FACE_N[fi], UP).premultiply(yaw);
        b.position.set(x, 0.5, 0.3); b.quaternion.set(q.x, q.y, q.z, q.w); this.sync(o); this.kick();
        return LabEngine.FACE_VALUES[fi];
      }
      const g = randomInt(2) === 1, q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), g ? Math.PI : 0).premultiply(yaw);
      b.position.set(x, 0.056, 0.3); b.quaternion.set(q.x, q.y, q.z, q.w); this.sync(o); this.kick();
      return g ? 'G' : 'A';
    });
  }

  /* ───────────── animated draws ───────────── */
  async drawCardAnim() {
    const keys = [];
    for (const s of ['S', 'C', 'H', 'D']) for (const r of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']) keys.push(r + s);
    const key = keys[randomInt(52)];
    await this.tween(0.22, k => { this.deck.rotation.y = Math.sin(k * Math.PI * 4) * 0.06 * (1 - k); }, x => x);
    if (this.drawnCards.length >= 5) {
      const old = this.drawnCards.shift(); this.cardsGroup.remove(old);
      ((old.children[0]).material).map?.dispose();
      ((old.children[0]).material).dispose(); ((old.children[1]).material).dispose();
      const from = this.drawnCards.map(c => c.position.clone());
      await this.tween(0.2, k => this.drawnCards.forEach((c, i) => c.position.lerpVectors(from[i], LabEngine.cardSlot(i), k)));
    }
    const card = this.makeCard(key), slot = LabEngine.cardSlot(this.drawnCards.length);
    const start = new THREE.Vector3(LabEngine.DECK_POS.x, 0.26, LabEngine.DECK_POS.z), fan = (rand() - 0.5) * 0.16;
    card.rotation.z = Math.PI; card.position.copy(start); this.cardsGroup.add(card); this.drawnCards.push(card);
    await this.tween(0.95, k => {
      card.position.lerpVectors(start, slot, k); card.position.y += Math.sin(k * Math.PI) * 1.1;
      card.rotation.z = Math.PI * (1 - easeInOut(Math.min(1, k * 1.25))); card.rotation.y = fan * k;
    }, easeOut);
    return { key, obj: card };
  }
  sectorAtPointer() {
    const a = (((Math.PI / 2 - this.wheel.rotation.z) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return this.sectorDefs.find(s => a >= s.start && a < s.start + s.len)?.c ?? this.sectorDefs[this.sectorDefs.length - 1].c;
  }
  async spinAnim() {
    const from = this.wheel.rotation.z;
    const target = from + Math.PI * 2 * (5 + randomInt(3)) + rand() * Math.PI * 2; // sudut akhir seragam → peluang ∝ luas bagian
    await this.tween(3.4, k => { this.wheel.rotation.z = from + (target - from) * k; }, k => 1 - Math.pow(1 - k, 4));
    this.wheel.rotation.z %= Math.PI * 2; this.kick();
    return this.sectorAtPointer();
  }
  async drawBallAnim() {
    const key = BAG[randomInt(BAG.length)], col = ballColor(key), B = LabEngine.BAG_POS;
    if (this.trayBalls.length >= 6) {
      const old = this.trayBalls.shift(); this.bagGroup.remove(old); (old.material).dispose();
      const from = this.trayBalls.map(b => b.position.clone());
      await this.tween(0.2, k => this.trayBalls.forEach((b, i) => b.position.lerpVectors(from[i], LabEngine.traySlot(i), k)));
    }
    const ball = new THREE.Mesh(this.ballGeo, this.ballMat(col)); ball.castShadow = true;
    const start = new THREE.Vector3(B.x, 1.3, B.z), up = new THREE.Vector3(B.x, 2.3, B.z), slot = LabEngine.traySlot(this.trayBalls.length);
    ball.position.copy(start); this.bagGroup.add(ball); this.trayBalls.push(ball);
    await this.tween(0.45, k => ball.position.lerpVectors(start, up, k), easeOut);
    await this.tween(0.6, k => { ball.position.lerpVectors(up, slot, k); ball.position.y += Math.sin(k * Math.PI) * 0.5; });
    await this.tween(0.3, k => { ball.position.y = slot.y + Math.abs(Math.sin(k * Math.PI * 2)) * 0.18 * (1 - k); }, x => x);
    return { key, obj: ball };
  }

  /* ───────────── mode visibility ───────────── */
  showMode() {
    const m = this.cfg.mode;
    const toggle = (o, on) => {
      if (on && !o.mesh.parent) this.scene.add(o.mesh);
      if (!on && o.mesh.parent) this.scene.remove(o.mesh);
      if (!on && this.world.bodies.includes(o.body)) this.world.removeBody(o.body);
    };
    this.dice.forEach((d, i) => toggle(d, m === 'dice' && i < this.cfg.dieCount));
    this.coins.forEach((c, i) => toggle(c, m === 'coin' && i < this.cfg.coinCount));
    toggle(this.cap, m === 'cap');
    this.cardsGroup.visible = m === 'cards'; this.spinnerGroup.visible = m === 'spinner'; this.bagGroup.visible = m === 'bag'; this.couponGroup.visible = m === 'coupon';
    if (m === 'cap') {
      const b = this.cap.body; b.position.set(0, 0.32, 0.6); b.quaternion.setFromEuler(0, 0, 0);
      b.velocity.setZero(); b.angularVelocity.setZero(); this.sync(this.cap);
    }
    if (m === 'dice') this.dice.slice(0, this.cfg.dieCount).forEach((d, i) => {
      d.body.position.set(this.cfg.dieCount === 1 ? 0 : i ? 0.9 : -0.9, 0.5, 0.6); d.body.quaternion.setFromEuler(0, i ? 0.5 : -0.3, 0);
      d.body.velocity.setZero(); d.body.angularVelocity.setZero(); this.sync(d);
    });
    if (m === 'coin') this.coins.slice(0, this.cfg.coinCount).forEach((c, i) => {
      c.body.position.set(this.cfg.coinCount === 1 ? 0 : i ? 1 : -1, 0.056, 0.6); c.body.quaternion.setFromEuler(0, 0, 0);
      c.body.velocity.setZero(); c.body.angularVelocity.setZero(); this.sync(c);
    });
    this.kick();
  }
}
