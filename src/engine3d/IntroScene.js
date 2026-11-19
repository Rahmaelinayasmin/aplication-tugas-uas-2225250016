import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Stage3D, canvasTexture, easeInOut, easeIn, easeOutQuart, lerp } from './Stage3D';
import { makeCard, makeDie, shadowAll, std } from './models';
import { seeded } from '../domain/probability/rng';

const noise = seeded(2026); // derau dekoratif (tekstur), BUKAN peluang

/* Intro 3D: meja permainan (dadu digulirkan, kartu) → kamera melaju ke depan → roda undian berlampu.
   "Ayo" → roda berputar (jarum berdetak di tiap pasak) → kamera masuk ke putaran.
   Hasil dadu & roda di sini DEKORATIF, bukan data peluang (roda selalu berhenti di kode siswa). */

const FONT = '"Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';
const WHEEL_POS = new THREE.Vector3(0, 3.3, -26);
const WHEEL_R = 2.3;
const PEGS = 16;
const SECTOR_COLORS = ['#7FB3E8', '#F4A6C0', '#F7D774', '#9FD8B9', '#C6B3F2', '#F6B98A', '#8CC9E8', '#F2C4D8'];

export class IntroScene extends Stage3D {
  constructor(o) {
    super(o);
    this.mode = 'casino';
    this.cam = { pos: new THREE.Vector3(), look: new THREE.Vector3(0, 0.95, 0), roll: 0, fov: 50 };
    this.flick = 0;
    this.buildWorld();
    this.buildTable();
    this.buildWheel();
    this.start();
    this.cam.pos.copy(this.casinoPose().pos);
    void this.rollDice();
  }

  /* ───────── dunia ───────── */
  buildWorld() {
    const s = this.scene;
    s.background = new THREE.Color('#121722');
    s.fog = new THREE.Fog('#121722', 16, 48);
    const pm = new THREE.PMREMGenerator(this.renderer);
    s.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
    s.environmentIntensity = 0.35;

    const carpet = canvasTexture(256, 256, (g, w) => {
      g.fillStyle = '#4A1E2A'; g.fillRect(0, 0, w, w);
      g.strokeStyle = 'rgba(214,170,90,.35)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(w / 2, 10); g.lineTo(w - 10, w / 2); g.lineTo(w / 2, w - 10); g.lineTo(10, w / 2); g.closePath(); g.stroke();
      g.fillStyle = 'rgba(214,170,90,.25)'; g.beginPath(); g.arc(w / 2, w / 2, 14, 0, Math.PI * 2); g.fill();
    }, { repeat: [18, 18] });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ map: carpet, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; s.add(floor);

    // tirai panggung di belakang roda
    const curtainTex = canvasTexture(512, 64, (g, w, h) => {
      for (let x = 0; x < w; x++) { const v = 0.55 + 0.45 * Math.sin((x / w) * Math.PI * 28); g.fillStyle = `rgb(${Math.round(70 + 60 * v)},${Math.round(20 + 14 * v)},${Math.round(48 + 30 * v)})`; g.fillRect(x, 0, 1, h); }
    });
    const curtain = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 12, 48, 1, true, Math.PI * 0.75, Math.PI * 0.5), new THREE.MeshStandardMaterial({ map: curtainTex, roughness: 0.9, side: THREE.BackSide }));
    curtain.position.set(0, 6, WHEEL_POS.z + 5); s.add(curtain);
    const stage = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.2, 0.4, 48), std('#3A2A22', 0.6));
    stage.position.set(0, 0.2, WHEEL_POS.z); stage.receiveShadow = true; s.add(stage);

    s.add(new THREE.HemisphereLight('#AFC2E8', '#2A1810', 0.55));
    const spot = new THREE.SpotLight('#FFE6C0', 90, 18, 0.62, 0.55, 1.6);
    spot.position.set(0.6, 6.2, 1.6); spot.target.position.set(0, 0.9, 0); spot.userData.shadow = true;
    spot.shadow.bias = -0.0004; spot.shadow.normalBias = 0.02;
    s.add(spot, spot.target);
    const wheelSpot = new THREE.SpotLight('#FFF1D6', 140, 22, 0.55, 0.6, 1.4);
    wheelSpot.position.set(0, 9, WHEEL_POS.z + 7); wheelSpot.target.position.copy(WHEEL_POS); wheelSpot.userData.shadow = true;
    s.add(wheelSpot, wheelSpot.target);
    const rim = new THREE.DirectionalLight('#8FB0FF', 0.5); rim.position.set(-6, 5, -8); s.add(rim);
  }

  buildTable() {
    const t = new THREE.Group(); this.scene.add(t); this.table = t;
    const RX = 1.95, RZ = 1.2, TOP = 0.92;
    const felt = canvasTexture(1024, 1024, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 40, w / 2, w / 2, w / 2);
      gr.addColorStop(0, '#2FA266'); gr.addColorStop(0.7, '#1E7B4A'); gr.addColorStop(1, '#155C37');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
      for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(0,0,0,${noise() * 0.05})`; g.fillRect(noise() * w, noise() * w, 2, 2); } // tekstur kain (dekoratif)
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, w / 2, w * 0.36, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = 'rgba(232,200,120,.55)'; g.lineWidth = 3; g.beginPath(); g.arc(w / 2, w / 2, w * 0.33, 0, Math.PI * 2); g.stroke();
      g.fillStyle = 'rgba(240,215,150,.55)'; g.font = `800 64px ${FONT}`; g.textAlign = 'center'; g.fillText('MaWiYas', w / 2, w * 0.82);
    });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.08, 72), [std('#155C37', 0.95), new THREE.MeshStandardMaterial({ map: felt, roughness: 0.95 }), std('#155C37', 0.95)]);
    top.scale.set(RX, 1, RZ); top.position.y = TOP - 0.04; top.receiveShadow = true; t.add(top);
    const wood = this.woodMaterial();
    const pts = []; for (let i = 0; i < 128; i++) { const a = (i / 128) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * (RX + 0.04), TOP + 0.02, Math.sin(a) * (RZ + 0.04))); }
    const rim = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, 0.11, 14, true), wood);
    t.add(rim);
    const apron = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.96, 0.22, 72, 1, true), wood); apron.scale.set(RX + 0.02, 1, RZ + 0.02); apron.position.y = TOP - 0.15; t.add(apron);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 0.7, 24), wood); ped.position.y = 0.4; t.add(ped);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.08, 32), wood); base.position.y = 0.04; t.add(base);
    shadowAll(t, true, true);

    // kartu dikipas + tumpukan kartu
    const fan = new THREE.Group(); fan.position.set(-0.55, TOP + 0.006, -0.15); t.add(fan);
    [['A', '♠', false], ['K', '♥', true], ['7', '♦', true]].forEach(([r, su, red], i) => {
      const c = makeCard(/** @type {string} */ (r), /** @type {string} */ (su), /** @type {boolean} */ (red));
      c.position.set(i * 0.16, i * 0.004, 0); c.rotation.y = 0.35 - i * 0.32; fan.add(c);
    });
    const deck = new THREE.Group(); deck.position.set(0.95, TOP, -0.35); deck.rotation.y = -0.25; t.add(deck);
    for (let i = 0; i < 9; i++) { const c = makeCard('Q', '♣', false); c.rotation.x = Math.PI; c.position.y = 0.005 + i * 0.0062; c.rotation.y = (i % 3) * 0.01; deck.add(c); }
    this.TOP = TOP;
    this.dice = [makeDie(0.34), makeDie(0.34, '#FBEFF3')];
    this.dice.forEach(d => { d.position.set(3, -5, 0); t.add(d); });
  }

  woodMaterial() {
    const tex = canvasTexture(256, 256, (g, w) => {
      g.fillStyle = '#6E3F22'; g.fillRect(0, 0, w, w);
      for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(${40 + noise() * 30},${20 + noise() * 10},10,${0.15 + noise() * 0.2})`; g.lineWidth = 1 + noise() * 2; g.beginPath(); const y = noise() * w; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 6, w * 0.6, y - 6, w, y + 2); g.stroke(); }
    }, { repeat: [4, 1] });
    return new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  }

  /** Dadu dilempar dari sisi meja, memantul, berguling, lalu berhenti (mata 5 dan 3) */
  async rollDice() {
    const top = this.TOP + 0.17;
    const plan = [
      { d: this.dice[0], from: new THREE.Vector3(2.4, 1.9, 0.9), to: new THREE.Vector3(-0.05, top, 0.45), base: new THREE.Euler(Math.PI / 2, 0, 0), yaw: 0.5, axis: new THREE.Vector3(0.3, 0.2, 1).normalize() },
      { d: this.dice[1], from: new THREE.Vector3(2.6, 2.1, 0.4), to: new THREE.Vector3(0.48, top, 0.28), base: new THREE.Euler(0, 0, Math.PI / 2), yaw: -0.4, axis: new THREE.Vector3(1, 0.4, 0.2).normalize() }
    ];
    for (const p of plan) {
      p.final = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw).multiply(new THREE.Quaternion().setFromEuler(p.base));
      p.spin = 7 + noise() * 2; // putaran dekoratif; mata dadu di intro bukan data peluang
    }
    await this.wait(0.35);
    await this.tween(1.5, (k) => {
      for (const p of plan) {
        const e = 1 - Math.pow(1 - k, 2.2);
        const pos = new THREE.Vector3().lerpVectors(p.from, p.to, e);
        const bounce = Math.abs(Math.cos(k * Math.PI * 3.2)) * Math.pow(1 - k, 2) * (p.from.y - top);
        pos.y = top + bounce;
        p.d.position.copy(pos);
        p.d.quaternion.copy(p.final).multiply(new THREE.Quaternion().setFromAxisAngle(p.axis, p.spin * Math.pow(1 - k, 2)));
      }
      if (k > 0.45 && !this.landed) { this.landed = true; this.o.onDiceLand?.(); }
    }, (t) => t);
  }

  /* ───────── roda undian ───────── */
  buildWheel() {
    const W = new THREE.Group(); W.position.copy(WHEEL_POS); this.scene.add(W); this.wheel = W;
    const wood = this.woodMaterial();
    const spin = new THREE.Group(); W.add(spin); this.spinner = spin;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R + 0.12, WHEEL_R + 0.12, 0.24, 72), wood); disc.rotation.x = Math.PI / 2; spin.add(disc);
    this.faceCanvas = document.createElement('canvas'); this.faceCanvas.width = this.faceCanvas.height = 1024;
    this.faceTex = new THREE.CanvasTexture(this.faceCanvas); this.faceTex.colorSpace = THREE.SRGBColorSpace; this.faceTex.anisotropy = 8;
    const face = new THREE.Mesh(new THREE.CircleGeometry(WHEEL_R, 96), new THREE.MeshPhysicalMaterial({ map: this.faceTex, roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.2 }));
    face.position.z = 0.125; spin.add(face);
    const brass = new THREE.MeshStandardMaterial({ color: '#D9B25F', roughness: 0.25, metalness: 0.9 });
    for (let i = 0; i < PEGS; i++) {
      const a = (i / PEGS) * Math.PI * 2 + Math.PI / PEGS;
      const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10), brass);
      peg.rotation.x = Math.PI / 2; peg.position.set(Math.sin(a) * (WHEEL_R - 0.06), Math.cos(a) * (WHEEL_R - 0.06), 0.22); spin.add(peg);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.2, 32), brass); hub.rotation.x = Math.PI / 2; hub.position.z = 0.2; spin.add(hub);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 12), std('#E8863A', 0.3)); cap.position.z = 0.32; spin.add(cap);
    // lampu bohlam di bingkai
    const n = this.hemat ? 16 : 28;
    this.bulbA = new THREE.MeshStandardMaterial({ color: '#FFF4D0', emissive: '#FFD27A', emissiveIntensity: 1.6 });
    this.bulbB = new THREE.MeshStandardMaterial({ color: '#FFF4D0', emissive: '#FFD27A', emissiveIntensity: 0.4 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(WHEEL_R + 0.3, 0.12, 12, 96), wood); W.add(ring);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), i % 2 ? this.bulbA : this.bulbB);
      b.position.set(Math.sin(a) * (WHEEL_R + 0.3), Math.cos(a) * (WHEEL_R + 0.3), 0.12); W.add(b);
    }
    // penyangga
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new RoundedBoxGeometry(0.22, 3.6, 0.22, 2, 0.05), wood);
      leg.position.set(s * 0.9, -1.55, -0.35); leg.rotation.z = s * 0.28; W.add(leg);
    }
    const foot = new THREE.Mesh(new RoundedBoxGeometry(2.8, 0.2, 0.9, 2, 0.06), wood); foot.position.set(0, -2.9, -0.35); W.add(foot);
    // jarum penunjuk (berdetak di tiap pasak)
    const ptr = new THREE.Group(); ptr.position.set(0, WHEEL_R + 0.42, 0.34); W.add(ptr); this.pointer = ptr;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 20), new THREE.MeshPhysicalMaterial({ color: '#E8863A', roughness: 0.3, clearcoat: 1 }));
    cone.rotation.x = Math.PI; cone.position.y = -0.2; ptr.add(cone);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), brass); ptr.add(pin);
    shadowAll(W, true, true);
    this.setSectors([{ code: '?', cls: 'kodemu' }]);
  }

  /** Isi roda: sektor 0 = kode siswa (tempat jarum berhenti) */
  setSectors(list) {
    const items = list.slice(0, 8);
    while (items.length < 8) items.push({ code: '?', cls: '' });
    const g = /** @type {CanvasRenderingContext2D} */ (this.faceCanvas.getContext('2d')), w = 1024, c = w / 2, R = 508, n = items.length, step = (Math.PI * 2) / n;
    g.clearRect(0, 0, w, w);
    items.forEach((it, i) => {
      const a0 = -Math.PI / 2 + i * step - step / 2;
      g.beginPath(); g.moveTo(c, c); g.arc(c, c, R, a0, a0 + step); g.closePath();
      const gr = g.createRadialGradient(c, c, 60, c, c, R);
      gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.25, SECTOR_COLORS[i % 8]); gr.addColorStop(1, SECTOR_COLORS[i % 8]);
      g.fillStyle = gr; g.fill();
      g.strokeStyle = '#FFFFFF'; g.lineWidth = 8; g.stroke();
      g.save(); g.translate(c, c); g.rotate(i * step);
      g.fillStyle = '#22262E'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `800 ${it.code.length > 6 ? 46 : 62}px ${MONO}`; g.fillText(it.code, 0, -330);
      if (it.cls) { g.fillStyle = '#3E4656'; g.font = `700 36px ${FONT}`; g.fillText(it.cls, 0, -262); }
      g.restore();
    });
    g.lineWidth = 14; g.strokeStyle = '#D9B25F'; g.beginPath(); g.arc(c, c, R - 6, 0, Math.PI * 2); g.stroke();
    this.faceTex.needsUpdate = true;
    this.needsRender = true;
  }

  /* ───────── kamera ───────── */
  fit(halfW, halfH) {
    const v = (this.camera.fov * Math.PI) / 360;
    const h = Math.atan(Math.tan(v) * this.camera.aspect);
    return Math.max(halfW / Math.tan(h), halfH / Math.tan(v));
  }
  casinoPose() {
    const d = this.fit(2.35, 1.7);
    return { pos: new THREE.Vector3(0, 0.95 + d * 0.55, d * 0.86), look: new THREE.Vector3(0, 0.8, 0) };
  }
  wheelPose() {
    const d = this.fit(WHEEL_R * 1.22, WHEEL_R * 1.9);
    return { pos: new THREE.Vector3(0, WHEEL_POS.y + 0.2, WHEEL_POS.z + d), look: WHEEL_POS.clone() };
  }
  onResize(w, h) {
    const fov = w / h < 1 ? 52 : 40;
    this.cam.fov = fov; this.camera.fov = fov; this.camera.updateProjectionMatrix();
    if (this.mode === 'casino') { const p = this.casinoPose(); this.cam.pos.copy(p.pos); this.cam.look.copy(p.look); }
    if (this.mode === 'wheel') { const p = this.wheelPose(); this.cam.pos.copy(p.pos); this.cam.look.copy(p.look); }
  }

  /** "Masuk": kamera melaju ke depan melewati meja menuju roda (kecepatan sedang) */
  async goToWheel() {
    this.mode = 'travel';
    const a = { pos: this.cam.pos.clone(), look: this.cam.look.clone() }, b = this.wheelPose();
    const ctrl = new THREE.Vector3(0, a.pos.y + 0.6, -1.5);
    await this.tween(1.9, (k) => {
      const u = 1 - k;
      this.cam.pos.set(0, 0, 0).addScaledVector(a.pos, u * u).addScaledVector(ctrl, 2 * u * k).addScaledVector(b.pos, k * k);
      this.cam.look.lerpVectors(a.look, b.look, Math.min(1, k * 1.4));
      this.viewOffsetY = lerp(0, 0.2, k); this.applyViewOffset();
    }, easeInOut);
    this.mode = 'wheel';
  }

  /** Roda berputar beberapa kali dan berhenti tepat di sektor 0 */
  async spin() {
    this.mode = 'spin';
    const r0 = this.spinner.rotation.z, target = r0 - Math.PI * 2 * 6;
    await this.tween(4.2, (k) => { this.spinner.rotation.z = lerp(r0, target, k); }, easeOutQuart);
    this.spinner.rotation.z = 0;
    await this.wait(0.35);
  }

  /** Kamera masuk ke dalam putaran roda */
  async dive() {
    this.mode = 'dive';
    const a = this.cam.pos.clone(), b = new THREE.Vector3(0, WHEEL_POS.y, WHEEL_POS.z + 0.5);
    const off0 = this.viewOffsetY, fov0 = this.camera.fov;
    await this.tween(1.25, (k) => {
      this.cam.pos.lerpVectors(a, b, k);
      this.cam.look.copy(WHEEL_POS);
      this.cam.roll = -k * Math.PI * 1.6;
      this.spinner.rotation.z -= 0.02 + k * 0.35;
      this.viewOffsetY = lerp(off0, 0, k);
      this.camera.fov = lerp(fov0, 82, k); this.cam.fov = this.camera.fov;
      this.applyViewOffset();
    }, easeIn);
  }

  update(dt) {
    const c = this.cam;
    const pos = c.pos.clone();
    if (this.mode === 'casino') pos.x += Math.sin(this.clock * 0.35) * 0.28; // kamera "bernapas" pelan
    this.camera.position.copy(pos);
    this.camera.lookAt(c.look);
    if (c.roll) this.camera.rotateZ(c.roll);
    // jarum berdetak saat pasak lewat
    const pegStep = (Math.PI * 2) / PEGS;
    const ph = ((-this.spinner.rotation.z % pegStep) + pegStep) % pegStep;
    const spinning = this.mode === 'spin' || this.mode === 'dive';
    this.pointer.rotation.z = spinning ? 0.45 * Math.max(0, 1 - ph / (pegStep * 0.4)) : lerp(this.pointer.rotation.z, 0, Math.min(1, dt * 10));
    // bohlam berkedip bergantian
    const blink = spinning ? Math.sin(this.clock * 18) > 0 : Math.sin(this.clock * 2.2) > 0;
    this.bulbA.emissiveIntensity = blink ? 1.8 : 0.35; this.bulbB.emissiveIntensity = blink ? 0.35 : 1.8;
    return spinning || this.mode === 'travel' ? 'live' : 'idle';
  }
}
