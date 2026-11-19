import * as THREE from 'three';
import { Stage3D, canvasTexture, easeInOut, easeOut, lerp, linear } from './Stage3D';
import { lifeTick, makeBowl, makeCar, makeCat, makeFlower, makeGesture, makeHouse, makeHuman, makeOffice, makeTree, restPose, setFace, std } from './models';
import { seeded } from '../domain/probability/rng';

/* Permainan pendamping Latihan Soal Berlevel (3D).
   Hasil permainan TIDAK acak: mengikuti benar/salahnya jawaban (domain/learning/quest.js). */

function softBackdrop(s, top, bottom) {
  s.background = canvasTexture(8, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
}
function lights(s, shadowBox = 4) {
  s.add(new THREE.HemisphereLight('#E6F0FF', '#9C8A70', 1.15));
  const sun = new THREE.DirectionalLight('#FFF4E0', 2.2);
  sun.position.set(3, 6, 4); sun.userData.shadow = true;
  const c = sun.shadow.camera; c.left = -shadowBox; c.right = shadowBox; c.top = shadowBox; c.bottom = -shadowBox; c.near = 0.5; c.far = 20;
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
  s.add(sun, sun.target);
  return sun;
}
function fitDistance(camera, halfW, halfH) {
  const v = (camera.fov * Math.PI) / 360, h = Math.atan(Math.tan(v) * camera.aspect);
  return Math.max(halfW / Math.tan(h), halfH / Math.tan(v));
}

/* ───────── Level Mudah: suit batu–kertas–gunting ───────── */
export class SuitScene extends Stage3D {
  constructor(o) {
    super(o);
    const s = this.scene;
    softBackdrop(s, '#DDEBFA', '#F7F3EC');
    lights(s);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 48), std('#EFE6D8', 0.95)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; s.add(floor);
    this.me = this.makePlayer({ shirt: '#5B8DEF', shorts: '#24407F', skin: '#E2B48E', hair: '#2B2118', iris: '#3A6FB0', number: 1 }, -0.62, Math.PI / 2);
    this.op = this.makePlayer({ shirt: '#E8863A', shorts: '#7A3E12', skin: '#A8714D', hair: '#151515', iris: '#6B3E1E', number: 2, hairStyle: 'short' }, 0.62, -Math.PI / 2);
    this.start();
  }
  makePlayer(look, x, ry) {
    const h = makeHuman({ ...look, lite: this.hemat }); h.root.position.x = x; h.root.rotation.y = ry; this.scene.add(h.root);
    restPose(h.parts);
    const a = h.parts.armR; a.sh.rotation.x = -1.15; a.elbow.rotation.x = -0.5;
    a.fist.visible = false;
    const gest = {}; for (const k of ['batu', 'kertas', 'gunting']) { const g = makeGesture(k, h.mats.skin); g.rotation.x = Math.PI; g.visible = k === 'batu'; a.hand.add(g); gest[k] = g; }
    return { ...h, gest, mood: 0 };
  }
  onResize() {
    this.camera.fov = 34; this.camera.updateProjectionMatrix();
    const d = fitDistance(this.camera, 1.35, 0.62);
    this.camera.position.set(0, 1.42, d); this.camera.lookAt(0, 1.22, 0);
  }
  show(pl, k) { for (const [g, m] of Object.entries(pl.gest)) m.visible = g === k; }
  /** @param {string} mine @param {string} theirs @param {boolean} win */
  async play(mine, theirs, win) {
    for (const pl of [this.me, this.op]) { this.show(pl, 'batu'); pl.mood = 0; setFace(pl, 'focus'); restPose(pl.parts); pl.parts.armR.sh.rotation.x = -1.15; pl.parts.armR.elbow.rotation.x = -0.5; pl.root.position.y = 0; }
    await this.tween(0.95, (k) => {
      const b = Math.sin(k * Math.PI * 3) * 0.42; // "suit… suit… suit!"
      for (const pl of [this.me, this.op]) { pl.parts.armR.sh.rotation.x = -1.15 - Math.max(0, b); pl.parts.armR.elbow.rotation.x = -0.5 - Math.max(0, b) * 0.6; }
    }, linear);
    this.show(this.me, mine); this.show(this.op, theirs);
    const W = win ? this.me : this.op, L = win ? this.op : this.me;
    setFace(W, 'happy'); setFace(L, 'open');
    await this.wait(0.25);
    await this.tween(0.6, (k) => {
      W.root.position.y = Math.sin(k * Math.PI) * 0.18;
      W.parts.armL.sh.rotation.z = lerp(0.12, 2.6, Math.min(1, k * 2));
      L.parts.torso.rotation.x = lerp(0, 0.32, k); L.parts.head.rotation.x = lerp(0, 0.35, k);
      L.parts.armL.sh.rotation.x = lerp(0, 0.2, k);
    }, easeOut);
  }
  update(dt) {
    const t = this.clock;
    for (const [i, pl] of [this.me, this.op].entries()) {
      // napas + kedip: tokoh tidak tampak membeku saat menunggu jawaban
      pl.parts.hips.position.y = 0.95 + Math.sin(t * 2 + i) * 0.005;
      pl.parts.torso.rotation.z = Math.sin(t * 0.7 + i * 2) * 0.02;
      lifeTick(pl, dt);
    }
    return 'idle';
  }
}

/* ───────── Level Sedang: pekerja berangkat ke kantor ───────── */
const SEG = 2.3; // satuan dunia per km
export class CarScene extends Stage3D {
  constructor(o) {
    super(o);
    this.total = o.total;
    const s = this.scene;
    softBackdrop(s, '#9CCDF0', '#E9F5FB');
    s.fog = new THREE.Fog('#E9F5FB', 18, 40);
    this.sun = lights(s, 7);
    const end = this.total * SEG;
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(end + 40, 30), std('#8CC97A', 0.95)); grass.rotation.x = -Math.PI / 2; grass.position.x = end / 2; grass.receiveShadow = true; s.add(grass);
    const road = canvasTexture(256, 128, (g, w, h) => {
      g.fillStyle = '#5B6270'; g.fillRect(0, 0, w, h);
      const rnd = seeded(3); for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(255,255,255,${rnd() * 0.06})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
      g.fillStyle = '#F2F2F2'; g.fillRect(0, 6, w, 5); g.fillRect(0, h - 11, w, 5);
      g.fillStyle = '#F7D774'; g.fillRect(20, h / 2 - 3, 110, 6);
    }, { repeat: [(end + 16) / 4, 1] });
    const roadM = new THREE.Mesh(new THREE.PlaneGeometry(end + 16, 2.8), new THREE.MeshStandardMaterial({ map: road, roughness: 0.85 }));
    roadM.rotation.x = -Math.PI / 2; roadM.position.set(end / 2, 0.01, 0.3); roadM.receiveShadow = true; s.add(roadM);
    const walk = new THREE.Mesh(new THREE.BoxGeometry(end + 16, 0.1, 0.8), std('#D9D2C5', 0.9)); walk.position.set(end / 2, 0.05, -1.5); walk.receiveShadow = true; s.add(walk);
    const house = makeHouse(); house.position.set(-2.4, 0, -3.2); s.add(house);
    const office = makeOffice(7); office.position.set(end + 1.6, 0, -3.4); s.add(office);
    // penanda km
    for (let k = 1; k < this.total; k++) {
      const sign = canvasTexture(64, 64, (g, w) => { g.fillStyle = '#2E8B62'; g.fillRect(0, 0, w, w); g.fillStyle = '#fff'; g.font = '800 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(k), w / 2, w / 2 + 2); });
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), std('#9AA3AF')); post.position.set(k * SEG, 0.4, -1.25); s.add(post);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.32), new THREE.MeshStandardMaterial({ map: sign })); plate.position.set(k * SEG, 0.88, -1.23); s.add(plate);
    }
    const rnd = seeded(5);
    for (let x = -6; x < end + 8; x += 2.2 + rnd() * 1.6) { const t = makeTree(0.9 + rnd() * 0.6); t.position.set(x, 0, -3.2 - rnd() * 3); if (Math.abs(x + 2.4) > 2 && Math.abs(x - end - 1.6) > 2) s.add(t); }
    for (let x = -4; x < end + 8; x += 3 + rnd() * 2) { const t = makeTree(0.7 + rnd() * 0.4); t.position.set(x, 0, 3.4 + rnd() * 2); s.add(t); }
    const c = makeCar('#5B8DEF'); this.car = c; c.car.position.set(0, 0, 0.55); s.add(c.car);
    this.km = 0;
    this.start();
  }
  onResize() {
    this.camera.fov = 36; this.camera.updateProjectionMatrix();
    this.dist = Math.max(4.5, fitDistance(this.camera, 2.6, 1.2));
    this.follow(true);
  }
  follow(instant) {
    const x = this.car.car.position.x;
    const want = new THREE.Vector3(x + 0.8, 1.9, this.dist), look = new THREE.Vector3(x + 1.3, 0.55, -0.4);
    if (instant || !this.camLook) { this.camera.position.copy(want); this.camLook = look; }
    else { this.camera.position.lerp(want, 0.12); this.camLook.lerp(look, 0.12); }
    this.camera.lookAt(this.camLook);
    if (this.sun) { this.sun.position.set(x + 3, 6, 4); this.sun.target.position.set(x, 0, 0); }
  }
  setKm(km, instant) {
    const from = this.car.car.position.x, to = km * SEG;
    this.km = km;
    if (instant) { this.car.car.position.x = to; this.follow(true); this.needsRender = true; return Promise.resolve(); }
    const dir = Math.sign(to - from);
    return this.tween(1.05, (k) => {
      const x = lerp(from, to, k), dx = x - this.car.car.position.x;
      this.car.car.position.x = x;
      for (const w of this.car.wheels) w.rotation.z -= dx / 0.24;
      const accel = Math.sin(k * Math.PI);
      this.car.body.rotation.z = -dir * accel * 0.03; this.car.cabin.rotation.z = -dir * accel * 0.05;
    }, easeInOut);
  }
  update() {
    this.follow(false);
    const moving = this.tweens.length > 0;
    return moving ? 'live' : this.camera.position.distanceTo(new THREE.Vector3(this.car.car.position.x + 0.8, 1.9, this.dist)) > 0.01 ? 'live' : false;
  }
}

/* ───────── Level Sulit: kucing lapar ───────── */
export class CatScene extends Stage3D {
  constructor(o) {
    super(o);
    const s = this.scene;
    softBackdrop(s, '#F8EEDC', '#F4E4CC');
    lights(s, 3);
    const wood = canvasTexture(256, 256, (g, w) => {
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#C89B6D' : '#BD8F60'; g.fillRect(0, (i * w) / 8, w, w / 8); }
      const rnd = seeded(9); g.strokeStyle = 'rgba(90,50,20,.18)';
      for (let i = 0; i < 60; i++) { g.beginPath(); const y = rnd() * w; g.moveTo(0, y); g.lineTo(w, y + rnd() * 4 - 2); g.stroke(); }
    }, { repeat: [3, 3] });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.6 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; s.add(floor);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), std('#F6E7D2', 0.95)); wall.position.set(0, 2, -1.2); wall.receiveShadow = true; s.add(wall);
    const board = new THREE.Mesh(new THREE.BoxGeometry(8, 0.14, 0.04), std('#FFFFFF', 0.6)); board.position.set(0, 0.07, -1.18); s.add(board);
    const rug = new THREE.Mesh(new THREE.CircleGeometry(0.75, 40), std('#B9A3F0', 0.95)); rug.rotation.x = -Math.PI / 2; rug.position.set(-0.3, 0.005, 0.1); rug.scale.y = 0.7; rug.receiveShadow = true; s.add(rug);
    const c = makeCat(); this.c = c; c.cat.position.set(-0.32, 0, 0.05); s.add(c.cat);
    const b = makeBowl(); this.bowl = b; b.bowl.position.set(0.55, 0, 0.1); s.add(b.bowl);
    this.zs = [];
    for (let i = 0; i < 3; i++) {
      const tex = canvasTexture(64, 64, (g, w) => { g.fillStyle = '#6A55B0'; g.font = '800 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('z', w / 2, w / 2); });
      const z = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); z.visible = false; s.add(z); this.zs.push(z);
    }
    this.mood = 'idle'; this.sleepK = 0;
    this.start();
  }
  onResize() {
    this.camera.fov = 34; this.camera.updateProjectionMatrix();
    const d = fitDistance(this.camera, 1.05, 0.48);
    this.camera.position.set(0.15, 0.95, d); this.camera.lookAt(0.12, 0.3, 0);
  }
  /** Bangun (kalau tidur) lalu makan; ikan dihabiskan lalu mangkuk diisi lagi */
  async eat() {
    if (this.sleepK > 0) { const s0 = this.sleepK; await this.tween(0.45, (k) => { this.sleepK = lerp(s0, 0, k); }); }
    this.mood = 'eat';
    const c = this.c, fish = this.bowl.fish;
    await this.tween(1.7, (k) => {
      const lean = Math.min(1, k * 4) * (k > 0.85 ? (1 - k) / 0.15 : 1);
      c.bodyG.rotation.z = -0.22 * lean; c.bodyG.position.x = 0.12 * lean;
      c.headG.rotation.z = -0.35 * lean - Math.abs(Math.sin(k * Math.PI * 8)) * 0.18 * lean;
      fish.scale.setScalar(Math.max(0.001, 1 - k * 1.1));
    }, linear);
    this.mood = 'happy';
    await this.wait(0.5);
    await this.tween(0.5, (k) => { fish.scale.setScalar(Math.max(0.001, k)); }, easeOut);
  }
  async sleep() {
    this.mood = 'sleep';
    const s0 = this.sleepK;
    await this.tween(0.8, (k) => { this.sleepK = lerp(s0, 1, k); }, easeInOut);
  }
  update(dt) {
    const c = this.c, t = this.clock, sk = this.sleepK;
    // pose tidur: badan rebah, kaki terlipat, kepala bersandar, mata terpejam
    c.bodyG.position.y = lerp(0.32, 0.17, sk);
    c.legs.forEach((l, i) => { l.rotation.z = (i < 2 ? 1 : -1) * 1.35 * sk; });
    if (this.mood !== 'eat') { c.headG.rotation.z = lerp(c.headG.rotation.z, -0.3 * sk + (this.mood === 'happy' ? Math.sin(t * 6) * 0.06 : 0), Math.min(1, dt * 8)); c.headG.position.y = 0.12 - 0.08 * sk; }
    for (const lid of c.lids) lid.scale.y = lerp(0.05, 1, sk);
    const breathe = 1 + Math.sin(t * (sk > 0.5 ? 1.6 : 2.6)) * 0.02;
    c.bodyG.scale.set(1, breathe, breathe);
    c.tail.forEach((seg, i) => { seg.rotation.x = Math.sin(t * (sk > 0.5 ? 0.8 : 2.2) - i * 0.6) * (sk > 0.5 ? 0.08 : 0.22); });
    this.zs.forEach((z, i) => {
      z.visible = sk > 0.6;
      const ph = (t * 0.45 + i / 3) % 1;
      z.position.set(0.15 + ph * 0.35, 0.55 + ph * 0.55, 0.1);
      z.scale.setScalar(0.08 + ph * 0.1);
      z.material.opacity = Math.sin(ph * Math.PI);
    });
    return this.tweens.length ? 'live' : 'idle';
  }
}

/* ───────── Penghargaan: bunga biru, merah muda, kuning, putih yang tumbuh & mekar ───────── */
export const FLOWER_COLORS = ['#7FB3E8', '#F4A6C0', '#F7D774', '#FFFFFF', '#F4A6C0', '#7FB3E8', '#F7D774'];
export class FlowerScene extends Stage3D {
  constructor(o) {
    super(o);
    const s = this.scene;
    softBackdrop(s, '#FFF2F7', '#FFF9EE');
    lights(s, 3);
    const mound = new THREE.Mesh(new THREE.SphereGeometry(3, 48, 16, 0, Math.PI * 2, 0, 0.5), std('#8CC97A', 0.95)); mound.position.y = -2.62; mound.receiveShadow = true; s.add(mound);
    this.flowers = FLOWER_COLORS.map((col, i) => {
      const f = makeFlower(col, col === '#FFFFFF' ? 9 : 7);
      const x = (i - 3) * 0.36, z = (i % 2) * -0.18;
      f.flower.position.set(x, 0.3 - Math.abs(x) * 0.08, z); f.flower.rotation.z = -x * 0.08;
      const sc = 0.85 + ((i * 37) % 10) / 40; f.flower.userData.scale = sc;
      f.flower.scale.set(sc, 0.001, sc);
      f.petals.forEach(p => { p.rotation.x = -1.35; });
      f.headG.scale.setScalar(0.2);
      s.add(f.flower);
      return f;
    });
    this.petalsFall = [];
    const pm = new THREE.MeshStandardMaterial({ color: '#F4A6C0', side: THREE.DoubleSide, roughness: 0.6 });
    for (let i = 0; i < (this.hemat ? 6 : 14); i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 4), i % 3 === 0 ? std('#7FB3E8') : i % 3 === 1 ? pm : std('#F7D774')); p.scale.set(1, 0.15, 0.6);
      p.userData = { x: ((i * 53) % 100) / 100 * 2.6 - 1.3, sp: 0.15 + ((i * 29) % 10) / 60, ph: ((i * 17) % 10) / 10 };
      s.add(p); this.petalsFall.push(p);
    }
    this.start();
    void this.bloom();
  }
  onResize() {
    this.camera.fov = 36; this.camera.updateProjectionMatrix();
    const d = fitDistance(this.camera, 1.45, 0.75);
    this.camera.position.set(0, 1.1, d); this.camera.lookAt(0, 0.85, 0);
  }
  async bloom() {
    await this.tween(2.6, (k) => {
      this.flowers.forEach((f, i) => {
        const local = Math.min(1, Math.max(0, (k - i * 0.07) / 0.55));
        const sc = f.flower.userData.scale;
        f.flower.scale.set(sc, Math.max(0.001, easeOut(Math.min(1, local * 1.6))) * sc, sc);
        const open = Math.max(0, (local - 0.45) / 0.55);
        f.headG.scale.setScalar(lerp(0.2, 1, easeOut(Math.min(1, local * 1.4))));
        f.petals.forEach(p => { p.rotation.x = lerp(-1.35, -0.18, easeOut(open)); });
      });
    }, linear);
  }
  update() {
    const t = this.clock;
    this.flowers.forEach((f, i) => { f.flower.rotation.z = Math.sin(t * 1.2 + i) * 0.04 - (i - 3) * 0.03; f.headG.rotation.y = t * 0.15 + i; });
    for (const p of this.petalsFall) {
      const u = p.userData, y = 2.2 - ((t * u.sp + u.ph) % 1) * 2.4;
      p.position.set(u.x + Math.sin(t + u.ph * 6) * 0.15, y, 0.3); p.rotation.set(t * 2 + u.ph, t, t * 1.3);
    }
    this.camera.position.x = Math.sin(t * 0.3) * 0.25; this.camera.lookAt(0, 0.85, 0);
    return 'idle';
  }
}
