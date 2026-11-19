import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTexture } from './Stage3D';
import { seeded } from '../domain/probability/rng';

/* Model 3D sederhana dari bentuk dasar (tanpa file aset → tetap offline & ringan).
   Semua tokoh orisinal (bukan tokoh/atlet/merek nyata). */

export const std = (color, roughness = 0.7, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });

export function shadowAll(obj, cast = true, receive = false) {
  obj.traverse((o) => { const m = /** @type {any} */ (o); if (m.isMesh) { m.castShadow = cast; m.receiveShadow = receive; } });
  return obj;
}

const FONT = '"Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif';

/* ───────── Dadu ───────── */
const PIP = { 1: [[0.5, 0.5]], 2: [[0.27, 0.27], [0.73, 0.73]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]], 5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.27, 0.22], [0.73, 0.22], [0.27, 0.5], [0.73, 0.5], [0.27, 0.78], [0.73, 0.78]] };
/** urutan sisi BoxGeometry: +x −x +y −y +z −z (sisi berhadapan berjumlah 7) */
export const DIE_FACES = [3, 4, 1, 6, 2, 5];
export function makeDie(size = 0.32, body = '#FBF8F3', pip = '#2E3440') {
  const mats = DIE_FACES.map((n) => {
    const tex = canvasTexture(128, 128, (g, w) => {
      g.fillStyle = body; g.fillRect(0, 0, w, w);
      g.fillStyle = n === 1 ? '#C8323C' : pip;
      for (const [x, y] of PIP[n]) { g.beginPath(); g.arc(x * w, y * w, n === 1 ? 15 : 11, 0, Math.PI * 2); g.fill(); }
    });
    return new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  });
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(size, size, size, 4, size * 0.16), mats);
  return shadowAll(mesh);
}

/* ───────── Kartu remi ───────── */
export function makeCard(rank, suit, red) {
  const W = 0.63, H = 0.88;
  const front = canvasTexture(256, 358, (g, w, h) => {
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#D9D2C5'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
    g.fillStyle = red ? '#C8323C' : '#22262E';
    g.font = `800 52px ${FONT}`; g.textAlign = 'center';
    g.fillText(rank, 34, 60); g.font = `48px ${FONT}`; g.fillText(suit, 34, 106);
    g.save(); g.translate(w - 34, h - 60); g.rotate(Math.PI); g.font = `800 52px ${FONT}`; g.fillText(rank, 0, 0); g.restore();
    g.font = `150px ${FONT}`; g.textBaseline = 'middle'; g.fillText(suit, w / 2, h / 2 + 6);
  });
  const back = canvasTexture(256, 358, (g, w, h) => {
    g.fillStyle = '#2F4FA0'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3;
    for (let i = -h; i < w + h; i += 18) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke(); }
    g.strokeStyle = '#fff'; g.lineWidth = 10; g.strokeRect(12, 12, w - 24, h - 24);
  });
  const edge = std('#F2EEE6', 0.6);
  const mats = [edge, edge, new THREE.MeshStandardMaterial({ map: front, roughness: 0.45 }), new THREE.MeshStandardMaterial({ map: back, roughness: 0.45 }), edge, edge];
  const m = new THREE.Mesh(new THREE.BoxGeometry(W, 0.006, H), mats);
  return shadowAll(m, true, true);
}

/* ───────── Bola sepak ───────── */
export function makeSoccerBall(r = 0.11) {
  const tex = canvasTexture(512, 256, (g, w, h) => {
    g.fillStyle = '#FAFAFA'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#22262E';
    const spots = [[0.5, 0.06], [0.5, 0.94], [0.1, 0.3], [0.3, 0.3], [0.5, 0.3], [0.7, 0.3], [0.9, 0.3], [0.0, 0.7], [0.2, 0.7], [0.4, 0.7], [0.6, 0.7], [0.8, 0.7], [1.0, 0.7]];
    for (const [x, y] of spots) {
      g.beginPath();
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; g.lineTo(x * w + Math.cos(a) * 30, y * h + Math.sin(a) * 26); }
      g.closePath(); g.fill();
    }
    g.strokeStyle = '#B9C0CA'; g.lineWidth = 2;
    for (const [x, y] of spots) for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; g.beginPath(); g.moveTo(x * w + Math.cos(a) * 30, y * h + Math.sin(a) * 26); g.lineTo(x * w + Math.cos(a) * 60, y * h + Math.sin(a) * 50); g.stroke(); }
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 }));
  return shadowAll(m);
}

/* ───────── Manusia bergaya anime (pemain bola, pemain suit) ─────────
   Tinggi ±1,85 m, kaki di y = 0, menghadap +z lokal. Sendi berupa Group agar mudah dianimasikan.
   Gaya: shading toon 3 tingkat + garis tepi (inverted hull), mata besar dilukis di kanvas.
   Tier hemat: tanpa garis tepi & tekstur wajah lebih kecil (aturan 15). Tokoh orisinal. */

let TOON_GRAD = null;
function toonGradient() {
  if (TOON_GRAD) return TOON_GRAD;
  const d = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  TOON_GRAD = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  TOON_GRAD.minFilter = TOON_GRAD.magFilter = THREE.NearestFilter;
  TOON_GRAD.needsUpdate = true;
  return TOON_GRAD;
}
export const toon = (color) => new THREE.MeshToonMaterial({ color, gradientMap: toonGradient() });

/** Garis tepi gaya anime: salinan sisi-belakang yang sedikit membesar */
function outline(mesh, mat, k = 1.06) {
  const o = new THREE.Mesh(mesh.geometry, mat);
  o.scale.setScalar(k);
  o.userData.outline = true;
  mesh.add(o);
  return mesh;
}

/* Wajah: mata besar bergradasi + kilau, alis, mulut kecil, rona pipi.
   Ekspresi: open | blink | happy | focus. Kanvas W×H memetakan petak bola depan kepala. */
const FACE_W = 512, FACE_H = 400;
function drawFace(g, w, h, kind, iris) {
  g.clearRect(0, 0, w, h);
  const s = w / FACE_W;
  g.save(); g.scale(s, s);
  // fitur wajah diperbesar 1,4× dari titik tengah → mata besar khas anime
  g.translate(256, 196); g.scale(1.4, 1.4); g.translate(-256, -196);
  const ink = '#2A1E1A';
  // rona pipi (D3: diam, hanya warna)
  g.fillStyle = 'rgba(244,140,150,.28)';
  for (const x of [168, 344]) { g.beginPath(); g.ellipse(x, 252, 34, 13, 0, 0, Math.PI * 2); g.fill(); }
  for (const side of [-1, 1]) {
    const cx = 256 + side * 92, cy = 172;
    if (kind === 'blink') {
      g.strokeStyle = ink; g.lineWidth = 9; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx - 36, cy + 6); g.quadraticCurveTo(cx, cy + 22, cx + 36, cy + 6); g.stroke();
      g.beginPath(); g.moveTo(cx + side * 36, cy + 6); g.lineTo(cx + side * 46, cy - 2); g.stroke();
    } else if (kind === 'happy') {
      g.strokeStyle = ink; g.lineWidth = 11; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx - 34, cy + 16); g.quadraticCurveTo(cx, cy - 26, cx + 34, cy + 16); g.stroke();
    } else {
      const focus = kind === 'focus';
      g.save();
      // bentuk mata (sklera) — mode fokus: kelopak atas lebih rendah
      g.beginPath();
      g.moveTo(cx - 38, cy - (focus ? 18 : 30));
      g.quadraticCurveTo(cx, cy - (focus ? 34 : 52), cx + 38, cy - (focus ? 22 : 30));
      g.quadraticCurveTo(cx + 42, cy + 34, cx, cy + 46);
      g.quadraticCurveTo(cx - 42, cy + 34, cx - 38, cy - (focus ? 18 : 30));
      g.closePath();
      g.fillStyle = '#FFFFFF'; g.fill();
      g.clip();
      // iris bergradasi (gelap di atas → terang di bawah)
      const gr = g.createLinearGradient(0, cy - 40, 0, cy + 44);
      gr.addColorStop(0, '#1E1410'); gr.addColorStop(0.45, iris); gr.addColorStop(1, '#F2D9A6');
      g.fillStyle = gr; g.beginPath(); g.ellipse(cx + side * 2, cy + 6, 27, 38, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#120C0A'; g.beginPath(); g.ellipse(cx + side * 2, cy + 4, 12, 19, 0, 0, Math.PI * 2); g.fill();
      // kilau
      g.fillStyle = '#FFFFFF';
      g.beginPath(); g.ellipse(cx - 9, cy - 10, 10, 12, -0.4, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(cx + 11, cy + 22, 5, 0, Math.PI * 2); g.fill();
      g.restore();
      // bulu mata atas tebal + kibasan di sudut luar
      g.strokeStyle = ink; g.lineWidth = 10; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(cx - 40, cy - (focus ? 16 : 28)); g.quadraticCurveTo(cx, cy - (focus ? 36 : 54), cx + 40, cy - (focus ? 20 : 28)); g.stroke();
      g.beginPath(); g.moveTo(cx + side * 38, cy - (focus ? 18 : 28)); g.lineTo(cx + side * 52, cy - (focus ? 22 : 36)); g.stroke();
      g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 22, cy + 46); g.quadraticCurveTo(cx, cy + 50, cx + 22, cy + 46); g.stroke();
    }
    // alis
    g.strokeStyle = ink; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath();
    if (kind === 'focus') { g.moveTo(cx - side * 36, cy - 64); g.lineTo(cx + side * 30, cy - 76); }
    else { g.moveTo(cx - 32, cy - 78); g.quadraticCurveTo(cx, cy - (kind === 'happy' ? 96 : 90), cx + 32, cy - 80); }
    g.stroke();
  }
  // hidung kecil
  g.strokeStyle = 'rgba(120,70,50,.55)'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(258, 236); g.lineTo(252, 248); g.stroke();
  // mulut
  g.strokeStyle = '#6B2C2C'; g.lineWidth = 6; g.lineCap = 'round';
  if (kind === 'happy') {
    g.fillStyle = '#7A2E32';
    g.beginPath(); g.moveTo(226, 290); g.quadraticCurveTo(256, 296, 286, 290); g.quadraticCurveTo(256, 338, 226, 290); g.fill();
    g.fillStyle = '#F07C86'; g.beginPath(); g.ellipse(256, 312, 13, 7, 0, 0, Math.PI * 2); g.fill();
  } else if (kind === 'focus') {
    g.beginPath(); g.moveTo(238, 300); g.lineTo(274, 298); g.stroke();
  } else {
    g.beginPath(); g.moveTo(236, 294); g.quadraticCurveTo(256, 310, 276, 294); g.stroke();
  }
  g.restore();
}

/** Rambut runcing: tudung + duri berbentuk kerucut. Arah duri dihitung dari titik pada kepala. */
function makeHair(mat, lineMat, R, cy, style) {
  const hair = new THREE.Group();
  const capG = new THREE.Mesh(new THREE.SphereGeometry(R * 1.07, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.6), mat);
  capG.position.y = cy; capG.rotation.x = -0.55; capG.scale.set(1, 1.12, 1.06); hair.add(capG); // depan sedikit naik; dahi tertutup poni
  if (lineMat) outline(capG, lineMat, 1.04);
  const up = new THREE.Vector3(0, 1, 0);
  const spike = (theta, phi, len, rad, droop) => {
    const dir = new THREE.Vector3(Math.sin(theta) * Math.sin(phi), Math.cos(theta) * 1.1, Math.sin(theta) * Math.cos(phi)).normalize();
    const point = dir.clone().multiplyScalar(R * 0.98); point.y += cy;
    const aim = dir.clone().add(new THREE.Vector3(0, -droop, 0)).normalize();
    const c = new THREE.Mesh(new THREE.ConeGeometry(rad, len, 6), mat);
    c.quaternion.setFromUnitVectors(up, aim);
    c.position.copy(point).addScaledVector(aim, len * 0.38);
    hair.add(c);
    if (lineMat) outline(c, lineMat, 1.08);
  };
  // mahkota & belakang
  const n = style === 'short' ? 7 : 9;
  for (let i = 0; i < n; i++) {
    const phi = Math.PI * 0.55 + (i / (n - 1)) * Math.PI * 0.9;
    spike(0.95 + (i % 2) * 0.25, phi, R * 1.05, R * 0.42, 0.85);
    spike(1.55, phi + 0.15, R * 0.95, R * 0.38, 1.6);
  }
  for (let i = 0; i < 5; i++) spike(0.3 + (i % 2) * 0.2, Math.PI + (i - 2) * 0.55, R * 1.0, R * 0.42, 0.9);
  // sisi dekat telinga
  for (const sd of [-1, 1]) { spike(1.25, sd * 1.35, R * 0.8, R * 0.32, 2.2); spike(1.0, sd * 1.05, R * 0.75, R * 0.32, 1.6); }
  // poni menjuntai di dahi (berhenti di atas mata)
  for (let i = 0; i < 5; i++) {
    const phi = (i - 2) * 0.32;
    spike(0.82 + Math.abs(i - 2) * 0.06, phi, R * 0.72, R * 0.3, 1.8 + Math.abs(i - 2) * 0.15);
  }
  return hair;
}

export function makeHuman({ shirt = '#5B8DEF', shorts = '#2F4F8F', skin = '#C99872', hair = '#22262E', socks = '#FFFFFF', boots = '#22262E', iris = '#7A4A2A', number = null, longPants = false, hairStyle = 'spiky', lite = false } = {}) {
  const root = new THREE.Group();
  const M = { shirt: toon(shirt), shorts: toon(shorts), skin: toon(skin), hair: toon(hair), socks: toon(socks), boots: toon(boots), sole: toon('#ECECEC') };
  const line = lite ? null : new THREE.MeshBasicMaterial({ color: '#1F1A24', side: THREE.BackSide });
  const cap = (r, len, mat, ol = 1.07) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), mat); if (line) outline(m, line, ol); return m; };

  const hips = new THREE.Group(); hips.position.y = 0.95; root.add(hips);
  const pelvis = cap(0.135, 0.12, M.shorts, 1.05); pelvis.rotation.z = Math.PI / 2; pelvis.scale.set(1, 1.05, 0.8); pelvis.position.y = 0.02; hips.add(pelvis);

  const torso = new THREE.Group(); torso.position.y = 0.08; hips.add(torso);
  // badan atletis: bahu lebar, pinggang ramping (profil lathe)
  const prof = [[0.001, -0.06], [0.15, -0.05], [0.155, 0.08], [0.17, 0.24], [0.205, 0.4], [0.215, 0.49], [0.17, 0.56], [0.08, 0.6], [0.001, 0.61]].map(([x, y]) => new THREE.Vector2(x, y));
  const chest = new THREE.Mesh(new THREE.LatheGeometry(prof, 20), M.shirt); chest.scale.set(1, 1, 0.66); torso.add(chest);
  if (line) outline(chest, line, 1.035);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.018, 8, 18), M.socks); collar.rotation.x = Math.PI / 2; collar.position.y = 0.585; torso.add(collar);
  if (number !== null) {
    const tex = canvasTexture(128, 128, (g, w) => { g.fillStyle = '#FFFFFF'; g.font = `800 92px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(number), w / 2, w / 2 + 6); });
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    decal.position.set(0, 0.32, 0.128); torso.add(decal);
    const back = decal.clone(); back.position.z = -0.128; back.rotation.y = Math.PI; back.scale.setScalar(1.3); torso.add(back);
  }
  const neck = cap(0.05, 0.08, M.skin, 1.08); neck.position.y = 0.62; torso.add(neck);

  // kepala sedikit lebih besar (proporsi anime), dagu runcing
  const R = 0.138, CY = 0.13;
  const head = new THREE.Group(); head.position.y = 0.66; head.scale.setScalar(1.1); torso.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(R, 28, 20), M.skin); skull.scale.set(1, 1.08, 1.02); skull.position.y = CY; head.add(skull);
  if (line) outline(skull, line, 1.035);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), M.skin); jaw.scale.set(0.92, 0.9, 0.95); jaw.position.set(0, 0.06, 0.012); head.add(jaw);
  // petak wajah (tekstur bertukar sesuai ekspresi)
  const fw = lite ? 256 : FACE_W, fh = lite ? 200 : FACE_H;
  const faces = {};
  for (const k of ['open', 'blink', 'happy', 'focus']) faces[k] = canvasTexture(fw, fh, (g, w, h) => drawFace(g, w, h, k, iris));
  const faceMat = new THREE.MeshBasicMaterial({ map: faces.open, transparent: true, alphaTest: 0.04, polygonOffset: true, polygonOffsetFactor: -2 });
  const face = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 24, 16, Math.PI / 2 - 0.85, 1.7, Math.PI * 0.36, Math.PI * 0.42), faceMat);
  skull.add(face);
  face.userData.textures = Object.values(faces); // dibongkar oleh Stage3D.dispose

  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), M.skin); ear.position.set(s * 0.135, 0.11, -0.005); ear.scale.set(0.5, 1, 0.8); head.add(ear);
  }
  const hairG = makeHair(M.hair, line, R, CY, hairStyle); head.add(hairG);

  const arm = (side) => {
    const sh = new THREE.Group(); sh.position.set(side * 0.25, 0.5, 0); torso.add(sh);
    const sleeve = cap(0.062, 0.11, M.shirt, 1.06); sleeve.position.y = -0.07; sh.add(sleeve);
    const upper = cap(0.044, 0.2, M.skin); upper.position.y = -0.17; sh.add(upper);
    const elbow = new THREE.Group(); elbow.position.y = -0.31; sh.add(elbow);
    const fore = cap(0.04, 0.19, M.skin); fore.position.y = -0.13; elbow.add(fore);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.04, 12), M.socks); band.position.y = -0.22; elbow.add(band);
    const hand = new THREE.Group(); hand.position.y = -0.27; elbow.add(hand);
    const fist = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), M.skin); fist.scale.set(0.85, 1.1, 0.9); hand.add(fist);
    if (line) outline(fist, line, 1.1);
    return { sh, elbow, hand, fist };
  };
  const leg = (side) => {
    const hip = new THREE.Group(); hip.position.set(side * 0.095, -0.02, 0); hips.add(hip);
    const thigh = cap(0.07, 0.28, longPants ? M.shorts : M.skin); thigh.position.y = -0.2; hip.add(thigh);
    if (!longPants) { const short = cap(0.084, 0.13, M.shorts, 1.05); short.position.y = -0.07; hip.add(short); }
    const knee = new THREE.Group(); knee.position.y = -0.43; hip.add(knee);
    const shin = cap(0.058, 0.28, longPants ? M.shorts : M.socks); shin.position.y = -0.2; knee.add(shin);
    const ankle = new THREE.Group(); ankle.position.y = -0.41; knee.add(ankle);
    const boot = new THREE.Mesh(new RoundedBoxGeometry(0.105, 0.085, 0.25, 2, 0.035), M.boots); boot.position.set(0, -0.035, 0.05); ankle.add(boot);
    if (line) outline(boot, line, 1.06);
    const sole = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.02, 0.255, 1, 0.008), M.sole); sole.position.set(0, -0.078, 0.05); ankle.add(sole);
    return { hip, knee, ankle, boot };
  };
  const parts = { hips, torso, head, hair: hairG, face, armL: arm(1), armR: arm(-1), legL: leg(1), legR: leg(-1) };
  shadowAll(root);
  root.traverse((o) => { if (o.userData.outline) { o.castShadow = false; o.receiveShadow = false; } });
  face.castShadow = false;

  const rnd = seeded(number ?? 5);
  const h = {
    root, parts, mats: M, faces,
    expr: 'open', blinkAt: 1 + rnd() * 2, blinkT: 0,
    hairVel: new THREE.Vector2(), prevHead: null,
    rnd
  };
  return h;
}

/** Ganti ekspresi dasar (open | happy | focus | blink) */
export function setFace(h, kind) {
  h.expr = kind;
  h.parts.face.material.map = h.faces[kind];
}

const _hv = new THREE.Vector3();
/**
 * Gerak "hidup" per frame: kedip alami (jeda acak dekoratif dari rng.js) & rambut menyusul gerak kepala (pegas).
 * Dipanggil dari update() adegan. @param {any} h @param {number} dt
 */
export function lifeTick(h, dt) {
  const p = h.parts;
  // kedip
  if (h.expr === 'open' || h.expr === 'focus') {
    h.blinkAt -= dt;
    if (h.blinkAt <= 0) {
      h.blinkT += dt;
      p.face.material.map = h.faces.blink;
      if (h.blinkT > 0.11) { p.face.material.map = h.faces[h.expr]; h.blinkT = 0; h.blinkAt = 1.8 + h.rnd() * 3.2; }
    }
  }
  // rambut: pegas teredam menyusul percepatan kepala (gerak sekunder)
  p.head.getWorldPosition(_hv);
  if (h.prevHead && dt > 0) {
    const vy = (_hv.y - h.prevHead.y) / dt;
    const vh = Math.hypot(_hv.x - h.prevHead.x, _hv.z - h.prevHead.z) / dt;
    const target = Math.max(-0.35, Math.min(0.35, vy * 0.12 - vh * 0.05));
    h.hairVel.x += ((target - p.hair.rotation.x) * 90 - h.hairVel.x * 9) * dt;
    p.hair.rotation.x += h.hairVel.x * dt;
  } else h.prevHead = new THREE.Vector3();
  h.prevHead.copy(_hv);
}

/** Pose netral (sedikit kontrapos agar tidak kaku) */
export function restPose(p) {
  p.hips.position.y = 0.95; p.hips.position.x = 0; p.hips.rotation.set(0, 0, 0); p.torso.rotation.set(0, 0, 0); p.head.rotation.set(0, 0, 0);
  for (const a of [p.armL, p.armR]) { a.sh.rotation.set(0, 0, 0); a.elbow.rotation.set(-0.12, 0, 0); a.hand.rotation.set(0, 0, 0); }
  p.armL.sh.rotation.z = 0.1; p.armR.sh.rotation.z = -0.1;
  for (const l of [p.legL, p.legR]) { l.hip.rotation.set(0, 0, 0); l.knee.rotation.set(0, 0, 0); l.ankle.rotation.set(0, 0, 0); }
}

/** Jongkok seimbang: paha maju, lutut menekuk, pergelangan mengimbangi (kaki tetap rata) */
export function crouch(p, c, lean = 0.5) {
  p.hips.position.y = 0.95 - 0.89 * (1 - Math.cos(c));
  for (const l of [p.legL, p.legR]) { l.hip.rotation.x = -c; l.knee.rotation.x = 2 * c; l.ankle.rotation.x = -c; }
  p.torso.rotation.x = c * lean;
}

/**
 * Siklus langkah/lari. phase dalam radian; amp = ayunan paha; run 0..1 (jalan → lari).
 * Lengan berayun berlawanan dengan kaki; lutut menekuk saat kaki diayun ke depan; pinggul memutar & naik-turun.
 */
export function gait(p, phase, amp, run = 0) {
  const s = Math.sin(phase), c = Math.cos(phase);
  p.legL.hip.rotation.x = -s * amp; p.legR.hip.rotation.x = s * amp;
  p.legL.knee.rotation.x = 0.1 + (0.35 + run * 1.1) * Math.max(0, c);
  p.legR.knee.rotation.x = 0.1 + (0.35 + run * 1.1) * Math.max(0, -c);
  p.legL.ankle.rotation.x = -0.15 * Math.max(0, -c); p.legR.ankle.rotation.x = -0.15 * Math.max(0, c);
  p.armL.sh.rotation.x = s * amp * (0.7 + run * 0.4); p.armR.sh.rotation.x = -s * amp * (0.7 + run * 0.4);
  p.armL.elbow.rotation.x = -0.35 - run * 1.0; p.armR.elbow.rotation.x = -0.35 - run * 1.0;
  p.armL.sh.rotation.z = 0.1 + run * 0.12; p.armR.sh.rotation.z = -0.1 - run * 0.12;
  p.hips.position.y = 0.95 - (0.025 + run * 0.03) * Math.abs(s) + run * 0.04 * Math.abs(c);
  p.hips.rotation.y = s * 0.12; p.torso.rotation.y = -s * 0.2;
  p.torso.rotation.x = 0.05 + run * 0.16;
  p.head.rotation.y = s * 0.1; // kepala tetap menatap ke depan
}

/* ───────── Bentuk tangan suit ───────── */
export function makeGesture(kind, skinMat) {
  const g = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), skinMat);
  const finger = (len) => { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.019, len, 4, 8), skinMat); return f; };
  if (kind === 'batu') { palm.scale.set(1, 1.05, 0.95); g.add(palm); }
  if (kind === 'kertas') {
    palm.scale.set(1.15, 1.2, 0.45); g.add(palm);
    for (let i = 0; i < 4; i++) { const f = finger(0.08); f.position.set(-0.05 + i * 0.033, 0.12, 0); f.rotation.z = (i - 1.5) * 0.08; g.add(f); }
    const th = finger(0.06); th.position.set(0.08, 0.02, 0); th.rotation.z = -0.9; g.add(th);
  }
  if (kind === 'gunting') {
    palm.scale.set(1, 1, 0.9); g.add(palm);
    for (const s of [-1, 1]) { const f = finger(0.1); f.position.set(s * 0.032, 0.125, 0); f.rotation.z = -s * 0.28; g.add(f); }
  }
  shadowAll(g);
  return g;
}

/* ───────── Mobil ───────── */
export function makeCar(color = '#5B8DEF') {
  const car = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, metalness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#9FC6E8', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.55 });
  const dark = std('#22262E', 0.6);
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.0, 0.42, 0.95, 3, 0.12), paint); body.position.y = 0.42; car.add(body);
  const cabin = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.42, 0.86, 3, 0.14), paint); cabin.position.set(-0.12, 0.8, 0); car.add(cabin);
  const win = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.32, 0.88, 2, 0.1), glass); win.position.set(-0.12, 0.82, 0); car.add(win);
  const bumpF = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.14, 0.9, 2, 0.05), dark); bumpF.position.set(1.0, 0.3, 0); car.add(bumpF);
  const bumpB = bumpF.clone(); bumpB.position.x = -1.0; car.add(bumpB);
  for (const z of [-0.3, 0.3]) {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshStandardMaterial({ color: '#FFF6C8', emissive: '#FFE58A', emissiveIntensity: 0.6 })); hl.position.set(1.0, 0.48, z); hl.scale.set(0.5, 1, 1); car.add(hl);
    const tl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshStandardMaterial({ color: '#D9343F', emissive: '#A0161F', emissiveIntensity: 0.5 })); tl.position.set(-1.0, 0.5, z); tl.scale.set(0.5, 1, 1); car.add(tl);
  }
  // pekerja di kursi pengemudi: kepala, rambut, kerah kemeja
  const driver = new THREE.Group(); driver.position.set(0.05, 0.86, 0.2); car.add(driver);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 14), std('#C99872', 0.6)); driver.add(hd);
  const hr = new THREE.Mesh(new THREE.SphereGeometry(0.135, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), std('#22262E', 0.9)); hr.position.y = 0.02; driver.add(hr);
  const shirt = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.08, 4, 10), std('#FFFFFF', 0.8)); shirt.position.y = -0.2; driver.add(shirt);
  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.02), std('#B23A55', 0.6)); tie.position.set(0, -0.2, 0.13); driver.add(tie);
  const wheels = [];
  const tyre = std('#1B1D22', 0.85), rim = std('#C9CED6', 0.3, 0.8);
  for (const x of [-0.62, 0.62]) for (const z of [-0.44, 0.44]) {
    const w = new THREE.Group(); w.position.set(x, 0.24, z); car.add(w);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 24), tyre); t.rotation.x = Math.PI / 2; w.add(t);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.17, 12), rim); r.rotation.x = Math.PI / 2; w.add(r);
    for (let k = 0; k < 4; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.172), rim); sp.rotation.z = (k * Math.PI) / 4; w.add(sp); }
    wheels.push(w);
  }
  shadowAll(car);
  win.castShadow = false;
  return { car, wheels, body, cabin };
}

/* ───────── Bangunan ───────── */
export function makeHouse() {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 1.8), std('#FFE9C9', 0.9)); wall.position.y = 0.8; g.add(wall);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.75, 1.0, 4), std('#C8553D', 0.8)); roof.position.y = 2.1; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.85); g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.8, 0.05), std('#7A4A2A', 0.7)); door.position.set(0.3, 0.4, 0.91); g.add(door);
  const w = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.05), new THREE.MeshStandardMaterial({ color: '#BFE3F5', emissive: '#6FA9D6', emissiveIntensity: 0.2 })); w.position.set(-0.5, 0.95, 0.91); g.add(w);
  return shadowAll(g, true, true);
}

export function makeOffice(floors = 7) {
  const g = new THREE.Group();
  const tex = canvasTexture(128, 256, (c, w, h) => {
    c.fillStyle = '#5E6E86'; c.fillRect(0, 0, w, h);
    const rows = floors * 2;
    for (let y = 0; y < rows; y++) for (let x = 0; x < 4; x++) {
      c.fillStyle = (x * 7 + y * 3) % 5 === 0 ? '#FFE9A8' : '#A9C8E6';
      c.fillRect(8 + x * 30, 8 + y * (h / rows), 22, h / rows - 8);
    }
  });
  const tower = new THREE.Mesh(new THREE.BoxGeometry(2.2, floors * 0.9, 2.0), [std('#5E6E86'), std('#5E6E86'), std('#4A5568'), std('#4A5568'), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, metalness: 0.2 }), std('#5E6E86')]);
  tower.position.y = (floors * 0.9) / 2; g.add(tower);
  const sign = canvasTexture(256, 64, (c, w, h) => { c.fillStyle = '#2E3440'; c.fillRect(0, 0, w, h); c.fillStyle = '#FFF'; c.font = `800 38px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('KANTOR', w / 2, h / 2 + 2); });
  const s = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: sign })); s.position.set(0, 0.9, 1.01); g.add(s);
  return shadowAll(g, true, true);
}

export function makeTree(scale = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.8, 8), std('#7A5A3A', 0.9)); trunk.position.y = 0.4; g.add(trunk);
  const leaves = std('#5FA35A', 0.85);
  for (const [x, y, z, r] of [[0, 1.1, 0, 0.5], [0.25, 0.95, 0.1, 0.35], [-0.22, 0.98, -0.05, 0.38], [0, 1.45, 0, 0.32]]) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leaves); b.position.set(x, y, z); g.add(b);
  }
  g.scale.setScalar(scale);
  return shadowAll(g);
}

/* ───────── Kucing ───────── */
export function makeCat() {
  const cat = new THREE.Group();
  const fur = std('#F0A04B', 0.85), belly = std('#FFE2BF', 0.9), dark = std('#1B1D22', 0.3), pink = std('#F4A6C0', 0.6);
  const cap = (r, len, m) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), m);
  const bodyG = new THREE.Group(); bodyG.position.y = 0.32; cat.add(bodyG);
  const body = cap(0.2, 0.42, fur); body.rotation.z = Math.PI / 2; bodyG.add(body);
  const bel = cap(0.15, 0.3, belly); bel.rotation.z = Math.PI / 2; bel.position.set(0.02, -0.07, 0); bodyG.add(bel);
  // garis belang
  for (const x of [-0.18, -0.06, 0.06]) { const st = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 20, Math.PI), std('#D97A2B', 0.85)); st.position.x = x; st.rotation.y = Math.PI / 2; bodyG.add(st); }
  const legs = [];
  for (const [x, z] of [[0.24, 0.1], [0.24, -0.1], [-0.24, 0.1], [-0.24, -0.1]]) {
    const l = new THREE.Group(); l.position.set(x, -0.12, z); bodyG.add(l);
    const m = cap(0.055, 0.14, fur); m.position.y = -0.1; l.add(m);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), belly); paw.position.y = -0.19; paw.scale.set(1.1, 0.6, 1); l.add(paw);
    legs.push(l);
  }
  const headG = new THREE.Group(); headG.position.set(0.36, 0.12, 0); bodyG.add(headG);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 18), fur); skull.scale.set(1, 0.92, 1.05); headG.add(skull);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), belly); muzzle.position.set(0.12, -0.05, 0); muzzle.scale.set(0.8, 0.7, 1.3); headG.add(muzzle);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), pink); nose.position.set(0.18, -0.02, 0); headG.add(nose);
  for (const z of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.13, 4), fur); ear.position.set(0, 0.16, z * 0.09); ear.rotation.x = z * 0.25; headG.add(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 4), pink); inner.position.set(0.02, 0.15, z * 0.09); inner.rotation.x = z * 0.25; headG.add(inner);
  }
  const eyes = [], lids = [];
  for (const z of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 10), std('#7BC96F', 0.2)); e.position.set(0.13, 0.04, z * 0.07); headG.add(e);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), dark); pupil.position.set(0.158, 0.04, z * 0.07); pupil.scale.set(0.6, 1.3, 0.6); headG.add(pupil);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.037, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), fur); lid.position.copy(e.position); lid.rotation.z = -Math.PI / 2; lid.scale.set(1, 0.05, 1); headG.add(lid);
    eyes.push(e, pupil); lids.push(lid);
  }
  const whisk = new THREE.LineBasicMaterial({ color: '#FFFFFF' });
  for (const z of [-1, 1]) for (const dy of [-0.01, -0.04]) {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.16, -0.04, z * 0.04), new THREE.Vector3(0.24, dy - 0.02, z * 0.17)]);
    headG.add(new THREE.Line(geo, whisk));
  }
  const tail = [];
  let parent = bodyG, px = -0.36;
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Group(); seg.position.set(px, i === 0 ? 0.05 : 0.11, 0); parent.add(seg);
    const m = cap(0.04 - i * 0.004, 0.08, i === 4 ? std('#D97A2B', 0.85) : fur); m.position.y = 0.055; seg.add(m);
    seg.rotation.z = i === 0 ? 0.9 : 0.25;
    tail.push(seg); parent = seg; px = 0;
  }
  shadowAll(cat);
  return { cat, bodyG, headG, legs, tail, lids };
}

export function makeBowl() {
  const g = new THREE.Group();
  const pts = [[0.0, 0], [0.2, 0], [0.24, 0.02], [0.27, 0.1], [0.25, 0.1], [0.22, 0.03], [0.0, 0.03]].map(([x, y]) => new THREE.Vector2(x, y));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), new THREE.MeshPhysicalMaterial({ color: '#E8863A', roughness: 0.3, clearcoat: 0.5 }));
  g.add(bowl);
  const fish = new THREE.Group(); fish.position.y = 0.08; g.add(fish);
  const fm = new THREE.MeshStandardMaterial({ color: '#8FB8DE', roughness: 0.3, metalness: 0.4 });
  const fb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 10), fm); fb.scale.set(1, 0.45, 0.35); fish.add(fb);
  const ft = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 3), fm); ft.rotation.z = Math.PI / 2; ft.position.x = -0.12; ft.scale.set(1, 1, 0.3); fish.add(ft);
  const fe = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), std('#1B1D22')); fe.position.set(0.06, 0.012, 0.03); fish.add(fe);
  shadowAll(g);
  return { bowl: g, fish };
}

/* ───────── Bunga ───────── */
export function makeFlower(color, petals = 7) {
  const f = new THREE.Group();
  const stemCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.04, 0.3, 0.02), new THREE.Vector3(-0.02, 0.62, 0), new THREE.Vector3(0, 0.9, 0)]);
  const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 20, 0.018, 6), std('#5E9E57', 0.8)); f.add(stem);
  for (const [y, s] of [[0.3, 1], [0.52, -1]]) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 6), std('#6DB565', 0.8)); leaf.scale.set(1, 0.18, 0.42); leaf.position.set(s * 0.07, y, 0); leaf.rotation.z = s * 0.5; f.add(leaf);
  }
  const headG = new THREE.Group(); headG.position.y = 0.9; f.add(headG);
  const white = color.toLowerCase() === '#ffffff';
  const pm = new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, sheen: 1, sheenColor: new THREE.Color(white ? '#E9E2FF' : '#FFFFFF'), side: THREE.DoubleSide });
  const petalList = [];
  for (let i = 0; i < petals; i++) {
    const pivot = new THREE.Group(); pivot.rotation.y = (i / petals) * Math.PI * 2; headG.add(pivot);
    const hinge = new THREE.Group(); pivot.add(hinge);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 8), pm); p.scale.set(0.55, 0.08, 1); p.position.z = 0.08; hinge.add(p);
    petalList.push(hinge);
  }
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.04, 14, 10), std(color === '#F7D774' ? '#E8863A' : '#F7C948', 0.6)); center.scale.y = 0.6; headG.add(center);
  shadowAll(f);
  return { flower: f, stem, headG, petals: petalList };
}
