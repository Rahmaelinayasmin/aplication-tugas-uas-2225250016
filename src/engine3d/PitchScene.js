import * as THREE from 'three';
import { Stage3D, canvasTexture, easeInOut, easeOut, lerp, linear } from './Stage3D';
import { crouch, gait, lifeTick, makeHuman, makeSoccerBall, makeTree, restPose, setFace, shadowAll, std } from './models';
import { seeded } from '../domain/probability/rng';

/* Lapangan 3D: pemain bola pemandu (gaya anime) menyapa (2× ketuk) → berbalik → lari ancang-ancang → menendang →
   kamera mengikuti bola melengkung → gol, jaring mengembang, bola memantul → pemain melompat senang. */

const GOAL_Z = -19;
const GOAL_W = 5.2, GOAL_H = 2.2, GOAL_D = 1.6;
const BALL_R = 0.11;

export class PitchScene extends Stage3D {
  constructor(o) {
    super(o);
    this.phase = 'greet'; // greet → cheer → kick → done
    this.cam = { pos: new THREE.Vector3(0, 1.5, 4.3), look: new THREE.Vector3(0, 1.1, 0) };
    this.buildWorld();
    this.buildGoal();
    this.buildPlayer();
    this.start();
  }

  buildWorld() {
    const s = this.scene;
    const sky = canvasTexture(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6FB2E8'); gr.addColorStop(0.6, '#BFE3F5'); gr.addColorStop(1, '#EAF6FC'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    s.background = sky;
    s.fog = new THREE.Fog('#D6EEF8', 30, 70);
    s.add(new THREE.HemisphereLight('#CFE8FF', '#5C8A4A', 1.1));
    const sun = new THREE.DirectionalLight('#FFF3DA', 2.4);
    sun.position.set(6, 12, 6); sun.target.position.set(0, 0, -6); sun.userData.shadow = true;
    const sc = sun.shadow.camera; sc.left = -12; sc.right = 12; sc.top = 14; sc.bottom = -26; sc.near = 1; sc.far = 50;
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
    s.add(sun, sun.target);

    // rumput bergaris potongan + garis lapangan & kotak penalti (satu tekstur)
    const L = 70, Wd = 46, CZ = -8; // lapangan berpusat di z = −8
    const tex = canvasTexture(1024, 1536, (g, w, h) => {
      const stripes = 14;
      for (let i = 0; i < stripes; i++) { g.fillStyle = i % 2 ? '#5FAE4E' : '#6BBB58'; g.fillRect(0, (i * h) / stripes, w, h / stripes + 1); }
      const rnd = seeded(7);
      for (let i = 0; i < 14000; i++) { g.fillStyle = `rgba(30,70,20,${rnd() * 0.12})`; g.fillRect(rnd() * w, rnd() * h, 2, 3); }
      const mx = (x) => ((x + Wd / 2) / Wd) * w, mz = (z) => ((z - CZ + L / 2) / L) * h;
      g.strokeStyle = 'rgba(255,255,255,.92)'; g.lineWidth = 6;
      g.strokeRect(mx(-8), mz(GOAL_Z), mx(8) - mx(-8), mz(GOAL_Z + 6) - mz(GOAL_Z));   // kotak penalti
      g.strokeRect(mx(-4), mz(GOAL_Z), mx(4) - mx(-4), mz(GOAL_Z + 2.5) - mz(GOAL_Z)); // kotak gawang
      g.beginPath(); g.moveTo(0, mz(GOAL_Z)); g.lineTo(w, mz(GOAL_Z)); g.stroke();      // garis gawang
      g.beginPath(); g.arc(mx(0), mz(GOAL_Z + 4.5), 6, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); // titik penalti
      g.beginPath(); g.arc(mx(0), mz(8), mx(4) - mx(0), 0, Math.PI * 2); g.stroke();   // lingkaran tengah
      g.beginPath(); g.moveTo(0, mz(8)); g.lineTo(w, mz(8)); g.stroke();
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(Wd, L), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2; ground.position.z = CZ; ground.receiveShadow = true; s.add(ground);
    // pagar tanaman & pohon di kejauhan
    const rnd = seeded(11);
    for (let i = 0; i < (this.hemat ? 10 : 22); i++) {
      const t = makeTree(1.4 + rnd() * 0.8); const side = i % 2 ? 1 : -1;
      t.position.set(side * (14 + rnd() * 6), 0, -30 + rnd() * 40); s.add(t);
    }
    for (let i = 0; i < 9; i++) { const t = makeTree(1.6 + rnd()); t.position.set(-16 + i * 4, 0, GOAL_Z - 9 - rnd() * 3); s.add(t); }
  }

  buildGoal() {
    const g = new THREE.Group(); g.position.z = GOAL_Z; this.scene.add(g);
    const white = std('#FFFFFF', 0.3);
    const post = (h) => new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, h, 16), white);
    for (const s of [-1, 1]) { const p = post(GOAL_H); p.position.set(s * GOAL_W / 2, GOAL_H / 2, 0); g.add(p); }
    const bar = post(GOAL_W + 0.12); bar.rotation.z = Math.PI / 2; bar.position.y = GOAL_H; g.add(bar);
    const metal = std('#C9CED6', 0.4, 0.6);
    for (const s of [-1, 1]) {
      const back = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, GOAL_D, 8), metal); back.rotation.x = Math.PI / 2; back.position.set(s * GOAL_W / 2, 0.02, -GOAL_D / 2); g.add(back);
      const diag = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, Math.hypot(GOAL_D, GOAL_H), 8), metal);
      diag.position.set(s * GOAL_W / 2, GOAL_H / 2, -GOAL_D / 2); diag.rotation.x = -Math.atan2(GOAL_D, GOAL_H); g.add(diag);
    }
    const netTex = canvasTexture(128, 128, (c, w) => { c.clearRect(0, 0, w, w); c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 5; for (let i = 0; i <= w; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, w); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); } }, { repeat: [GOAL_W * 4, GOAL_H * 4] });
    const netMat = new THREE.MeshStandardMaterial({ map: netTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.9 });
    // jaring belakang miring: bisa mengembang saat bola masuk
    const backNet = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_W, Math.hypot(GOAL_D, GOAL_H), 26, 14), netMat);
    backNet.position.set(0, GOAL_H / 2, -GOAL_D / 2); backNet.rotation.x = -Math.atan2(GOAL_D, GOAL_H); g.add(backNet);
    this.netBase = Float32Array.from(backNet.geometry.attributes.position.array);
    this.backNet = backNet;
    for (const s of [-1, 1]) {
      const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(-GOAL_D, 0); shape.lineTo(0, GOAL_H); shape.closePath();
      const sideTex = netTex.clone(); sideTex.repeat.set(GOAL_D * 4, GOAL_H * 4); sideTex.needsUpdate = true;
      const side = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ map: sideTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }));
      side.rotation.y = Math.PI / 2; side.position.x = s * GOAL_W / 2; g.add(side);
      const uv = side.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / GOAL_D, uv.getY(i) / GOAL_H);
    }
    shadowAll(g, true, false);
    this.goal = g;
  }

  buildPlayer() {
    // tokoh orisinal bergaya anime; tier hemat tanpa garis tepi
    const h = makeHuman({ shirt: '#5B8DEF', shorts: '#24407F', skin: '#C08A64', hair: '#1E2433', iris: '#3A6FB0', number: 8, lite: this.hemat });
    this.human = h; this.p = h.parts;
    h.root.position.set(0, 0, 0);
    this.scene.add(h.root);
    restPose(this.p);
    this.ball = makeSoccerBall(BALL_R);
    this.ball.position.set(0.42, BALL_R, 0.35);
    this.scene.add(this.ball);
    this.shadowBlob = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.18, depthWrite: false }));
    this.shadowBlob.rotation.x = -Math.PI / 2; this.shadowBlob.position.y = 0.01; this.shadowBlob.visible = this.hemat; this.scene.add(this.shadowBlob);
    this.blend = null;
  }

  onResize(w, h) {
    this.camera.fov = w / h < 1 ? 50 : 38;
    this.camera.updateProjectionMatrix();
    if (this.phase === 'greet' || this.phase === 'cheer') {
      const v = (this.camera.fov * Math.PI) / 360;
      const d = Math.max(1.25 / Math.tan(v), 0.9 / Math.tan(Math.atan(Math.tan(v) * this.camera.aspect)));
      this.cam.pos.set(0.15, 1.35, d); this.cam.look.set(0, 1.05, 0);
    }
  }

  /** Posisi kepala di layar (untuk balon kata) */
  headScreen() {
    const v = new THREE.Vector3(); this.p.head.getWorldPosition(v); v.y += 0.42;
    return this.toScreen(v);
  }

  /** Mulai transisi halus dari pose sekarang ke pose berikutnya (tanpa "loncat") */
  startBlend(dur = 0.25) { this.blend = { snap: capturePose(this.p, this.human.root), t: 0, dur }; }

  /** Ketukan kedua: ajakan semangat (lompat sambil kedua tinju ke atas) */
  cheer() { this.startBlend(0.3); this.phase = 'cheer'; this.cheerT = 0; setFace(this.human, 'happy'); }

  /** Berbalik sambil melangkah mundur, lari ancang-ancang, tumpu kaki kiri, tendang dengan kaki kanan */
  async kick() {
    this.phase = 'kick';
    const p = this.p, root = this.human.root;
    setFace(this.human, 'focus');
    root.position.y = 0;
    const b0 = this.ball.position.clone(), bStart = new THREE.Vector3(0.12, BALL_R, -0.75);
    const camA = this.cam.pos.clone(), lookA = this.cam.look.clone();
    const camB = new THREE.Vector3(1.7, 1.5, 2.6), lookB = new THREE.Vector3(0, 0.6, -1.4);
    const snap = capturePose(p, root);
    // 1) berbalik ke arah gawang sambil mundur beberapa langkah kecil (kaki ikut melangkah, tidak meluncur)
    const start = new THREE.Vector3(-0.45, 0, 0.75);
    await this.tween(0.85, (k) => {
      restPose(p);
      gait(p, k * Math.PI * 3, 0.22 * Math.sin(k * Math.PI), 0);
      blendFrom(p, root, snap, Math.min(1, k * 4));
      root.rotation.y = lerp(0, Math.PI - 0.38, k);
      root.position.x = lerp(0, start.x, k); root.position.z = lerp(0, start.z, k);
      this.ball.position.lerpVectors(b0, bStart, k);
      this.ball.rotation.x -= 0.12;
      this.cam.pos.lerpVectors(camA, camB, k); this.cam.look.lerpVectors(lookA, lookB, k);
    }, easeInOut);
    // 2) lari ancang-ancang: 3 langkah, makin cepat, badan condong ke depan
    const plant = new THREE.Vector3(0.03, 0, -0.48);
    await this.tween(0.72, (k) => {
      const run = 0.35 + 0.5 * k;
      gait(p, k * Math.PI * 3, 0.5 + 0.15 * k, run);
      root.position.x = lerp(start.x, plant.x, k); root.position.z = lerp(start.z, plant.z, k);
      root.rotation.y = lerp(Math.PI - 0.38, Math.PI - 0.1, k);
    }, (t) => t * (0.75 + 0.25 * t));
    // 3) tumpu: kaki kiri menapak di samping bola, kaki kanan ditarik ke belakang, lengan kiri membuka untuk keseimbangan
    const s3 = capturePose(p, root);
    await this.tween(0.16, (k) => {
      restPose(p);
      p.legL.hip.rotation.x = -0.32; p.legL.knee.rotation.x = 0.35; p.legL.ankle.rotation.x = -0.05;
      p.legR.hip.rotation.x = 0.85; p.legR.knee.rotation.x = 1.55; p.legR.ankle.rotation.x = 0.3;
      p.hips.position.y = 0.9; p.hips.rotation.y = -0.32; p.hips.rotation.z = 0.06;
      p.torso.rotation.x = -0.14; p.torso.rotation.z = 0.12; p.torso.rotation.y = 0.15;
      p.armL.sh.rotation.z = 1.25; p.armL.sh.rotation.x = -0.35; p.armL.elbow.rotation.x = -0.4;
      p.armR.sh.rotation.z = -0.7; p.armR.sh.rotation.x = 0.55; p.armR.elbow.rotation.x = -0.5;
      p.head.rotation.x = 0.28; // mata ke bola
      blendFrom(p, root, s3, k);
      root.rotation.y = lerp(Math.PI - 0.1, Math.PI, k);
      root.position.z = lerp(plant.z, plant.z - 0.04, k);
    }, easeOut);
    // 4) ayunan: pinggul memutar, lutut baru meluruskan di akhir (cambuk), punggung kaki menghantam bola
    this.o.onKick?.();
    let hit = false;
    await this.tween(0.2, (k) => {
      const kn = Math.pow(k, 1.6);
      p.legR.hip.rotation.x = lerp(0.85, -1.4, k);
      p.legR.knee.rotation.x = lerp(1.55, 0.05, kn);
      p.legR.ankle.rotation.x = lerp(0.3, -0.45, k);
      p.hips.rotation.y = lerp(-0.32, 0.38, k);
      p.torso.rotation.y = lerp(0.15, -0.25, k);
      p.torso.rotation.x = lerp(-0.14, 0.2, k);
      p.armL.sh.rotation.x = lerp(-0.35, -0.9, k); p.armL.sh.rotation.z = lerp(1.25, 0.9, k);
      p.armR.sh.rotation.x = lerp(0.55, 0.9, k);
      p.hips.position.y = lerp(0.9, 0.97, k);
      if (!hit && k > 0.5) { hit = true; void this.flyBall(); }
    }, (t) => t * t * (3 - 2 * t) * 0.4 + t * t * 0.6);
    // 5) gerak lanjutan: badan terbawa maju, loncat kecil di kaki tumpu
    const z5 = root.position.z;
    await this.tween(0.38, (k) => {
      p.legR.hip.rotation.x = lerp(-1.4, -0.55, k); p.legR.knee.rotation.x = lerp(0.05, 0.5, k);
      p.legL.knee.rotation.x = 0.35 - Math.sin(k * Math.PI) * 0.25;
      p.torso.rotation.x = lerp(0.2, 0.08, k); p.hips.rotation.y = lerp(0.38, 0.1, k);
      p.head.rotation.x = lerp(0.28, -0.15, k);
      root.position.z = lerp(z5, z5 - 0.35, k); root.position.y = Math.sin(k * Math.PI) * 0.07;
    }, easeOut);
    // 6) kaki kanan mendarat, berdiri menatap bola
    setFace(this.human, 'open');
    const s6 = capturePose(p, root);
    await this.tween(0.35, (k) => {
      restPose(p);
      p.head.rotation.x = -0.18; p.legL.knee.rotation.x = 0.1; p.legR.hip.rotation.x = -0.1;
      blendFrom(p, root, s6, k);
      root.position.y = 0;
    }, easeInOut);
    this.phase = 'watch';
  }

  async flyBall() {
    const a = this.ball.position.clone();
    const target = new THREE.Vector3(1.1, 1.35, GOAL_Z - 0.9);
    this.chase = true;
    // tendangan melengkung (efek putar): bola berbelok ke kanan lalu kembali ke sasaran
    await this.tween(1.25, (k) => {
      const e = k * (1.15 - 0.15 * k); // sedikit melambat karena hambatan udara
      this.ball.position.set(lerp(a.x, target.x, e) - Math.sin(e * Math.PI) * 0.7, a.y + (target.y - a.y) * e + Math.sin(e * Math.PI) * 2.1, lerp(a.z, target.z, e));
      this.ball.rotation.x -= 0.34; this.ball.rotation.y += 0.08;
    }, linear);
    // jaring mengembang, bola tertahan sebentar
    this.o.onGoal?.();
    this.goalFlag = true;
    const hit = this.ball.position.clone();
    await this.tween(0.45, (k) => {
      this.bulge = Math.sin(k * Math.PI) * 0.55;
      this.ball.position.set(hit.x, hit.y - k * k * 0.25, hit.z - Math.sin(k * Math.PI / 2) * 0.35);
      this.ball.rotation.x -= 0.08 * (1 - k);
      this.applyBulge(hit);
    }, easeOut);
    this.bulge = 0; this.applyBulge(hit);
    // jatuh dengan gravitasi & memantul beberapa kali (energi berkurang tiap pantulan)
    this.ballVel = new THREE.Vector3(0, -0.2, 1.1);
  }

  applyBulge(hit) {
    const pos = this.backNet.geometry.attributes.position, base = this.netBase;
    const local = this.backNet.worldToLocal(hit.clone());
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      const d2 = (x - local.x) ** 2 + (y - local.y) ** 2;
      pos.setZ(i, base[i * 3 + 2] - (this.bulge || 0) * Math.exp(-d2 / 0.6));
    }
    pos.needsUpdate = true;
  }

  /** Pose lompat sorak; tau 0..1 satu siklus: melayang (0–0,4) → mendarat, menekuk, menolak (0,4–1) */
  hopPose(tau, height = 0.26) {
    const p = this.p, root = this.human.root;
    restPose(p);
    let c = 0, y = 0, a = 1;
    if (tau < 0.4) { const u = tau / 0.4; y = Math.sin(u * Math.PI) * height; c = Math.sin(u * Math.PI) * 0.12; }
    else { const u = (tau - 0.4) / 0.6; c = Math.sin(u * Math.PI) * 0.42; a = 1 - 0.75 * Math.sin(u * Math.PI); }
    crouch(p, c, 0.6);
    root.position.y = y;
    p.armL.sh.rotation.z = lerp(0.35, 2.85, a); p.armR.sh.rotation.z = -lerp(0.35, 2.85, a);
    p.armL.sh.rotation.x = p.armR.sh.rotation.x = (1 - a) * 0.6;
    p.armL.elbow.rotation.x = p.armR.elbow.rotation.x = -0.25 - (1 - a) * 0.5;
    p.head.rotation.x = -0.12 * a;
  }

  update(dt) {
    const p = this.p, t = this.clock, root = this.human.root;
    if (this.phase === 'greet') {
      // napas, berpindah tumpuan berat badan, melambai dengan lengan bawah (tangan sedikit terlambat → luwes)
      const w = Math.sin(t * 0.6);
      restPose(p);
      p.hips.position.x = w * 0.022; p.hips.rotation.z = w * 0.035; p.torso.rotation.z = -w * 0.05;
      p.legL.hip.rotation.z = -w * 0.035; p.legR.hip.rotation.z = -w * 0.035;
      p.legL.knee.rotation.x = Math.max(0, w) * 0.16; p.legR.knee.rotation.x = Math.max(0, -w) * 0.16;
      p.legL.hip.rotation.x = -Math.max(0, w) * 0.08; p.legR.hip.rotation.x = -Math.max(0, -w) * 0.08;
      p.hips.position.y = 0.95 - Math.abs(w) * 0.008 + Math.sin(t * 1.8) * 0.004;
      p.torso.rotation.x = 0.02 + Math.sin(t * 1.8) * 0.012;
      p.armR.sh.rotation.z = -2.45; p.armR.sh.rotation.x = -0.3;
      p.armR.elbow.rotation.z = -0.45 + Math.sin(t * 6.5) * 0.42;
      p.armR.hand.rotation.z = Math.sin(t * 6.5 - 0.7) * 0.3;
      p.armL.sh.rotation.z = 0.12 + Math.sin(t * 1.8) * 0.012;
      p.head.rotation.z = Math.sin(t * 1.3) * 0.07 - w * 0.02; p.head.rotation.x = -0.04;
    }
    if (this.phase === 'cheer') {
      this.cheerT += dt;
      this.hopPose((this.cheerT % 0.95) / 0.95);
    }
    if (this.phase === 'watch' && this.goalFlag) { this.startBlend(0.25); this.phase = 'celebrate'; this.celT = 0; setFace(this.human, 'happy'); }
    if (this.phase === 'celebrate') {
      this.celT += dt;
      this.hopPose((this.celT % 1.1) / 1.1, 0.2);
    }
    if (this.blend && this.phase !== 'kick') {
      this.blend.t += dt;
      const k = Math.min(1, this.blend.t / this.blend.dur);
      blendFrom(p, root, this.blend.snap, easeInOut(k));
      if (k >= 1) this.blend = null;
    }
    if (this.ballVel) {
      // integrasi sederhana: gravitasi, pantulan tanah (restitusi 0,55), gesek rumput
      const b = this.ball.position, v = this.ballVel;
      v.y -= 9.8 * dt;
      b.addScaledVector(v, dt);
      if (b.y < BALL_R) { b.y = BALL_R; v.y = Math.abs(v.y) > 0.4 ? -v.y * 0.55 : 0; v.z *= 0.8; }
      if (v.y === 0) v.z *= Math.max(0, 1 - dt * 2.5);
      this.ball.rotation.x += v.z * dt / BALL_R;
      if (v.y === 0 && Math.abs(v.z) < 0.03) { this.ballVel = null; }
    }
    if (this.chase) {
      // kamera mengikuti bola dari belakang-samping, lalu berhenti di depan gawang
      const bp = this.ball.position;
      const want = new THREE.Vector3(bp.x + 1.0, Math.max(1.4, bp.y + 0.7), Math.max(GOAL_Z + 5.2, bp.z + 3.4));
      this.cam.pos.lerp(want, Math.min(1, dt * 5));
      this.cam.look.lerp(new THREE.Vector3(bp.x * 0.6, Math.max(1, bp.y), Math.min(bp.z - 1, GOAL_Z + 1)), Math.min(1, dt * 6));
    }
    lifeTick(this.human, dt);
    this.camera.position.copy(this.cam.pos);
    this.camera.lookAt(this.cam.look);
    if (this.hemat) { this.shadowBlob.position.x = root.position.x; this.shadowBlob.position.z = root.position.z; }
    this.o.onFrame?.();
    return this.phase === 'kick' || this.chase || this.ballVel || this.phase === 'cheer' || this.phase === 'celebrate' ? 'live' : 'idle';
  }
}

/* ───────── Bantu pose: rekam & campur agar perpindahan gerak mulus ───────── */
function joints(p) {
  return [p.hips, p.torso, p.head, p.armL.sh, p.armL.elbow, p.armL.hand, p.armR.sh, p.armR.elbow, p.armR.hand,
    p.legL.hip, p.legL.knee, p.legL.ankle, p.legR.hip, p.legR.knee, p.legR.ankle];
}
function capturePose(p, root) {
  return { rot: joints(p).map(j => j.rotation.clone()), hipY: p.hips.position.y, hipX: p.hips.position.x, rootY: root.position.y };
}
/** Campur pose sekarang dengan rekaman: k = 0 → rekaman, k = 1 → pose sekarang */
function blendFrom(p, root, snap, k) {
  joints(p).forEach((j, i) => {
    const s = snap.rot[i];
    j.rotation.set(lerp(s.x, j.rotation.x, k), lerp(s.y, j.rotation.y, k), lerp(s.z, j.rotation.z, k));
  });
  p.hips.position.y = lerp(snap.hipY, p.hips.position.y, k);
  p.hips.position.x = lerp(snap.hipX, p.hips.position.x, k);
  root.position.y = lerp(snap.rootY, root.position.y, k);
}
