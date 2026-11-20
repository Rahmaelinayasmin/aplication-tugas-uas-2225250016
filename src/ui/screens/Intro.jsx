import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../app/store';
import { CLASS_RE, CODE_RE, listStudents, login, normClass, normCode } from '../../data/repo';
import { IntroScene } from '../../engine3d/IntroScene';
import { PitchScene } from '../../engine3d/PitchScene';
import { Canvas3D, use3D } from '../components/Canvas3D';
import { playResult } from '../sound';

/* Alur pembuka (permintaan peneliti, 17 Nov 2026):
   ① Meja permainan + dadu & kartu → "Masuk" → kamera melaju ke depan (kecepatan sedang)
   ② Roda undian berisi kode siswa & kode kelas → isi kode → "Ayo" → roda berputar, kamera masuk ke putaran
   ③ Pemain bola menyapa (2× ketuk) → menendang bola, kamera mengikuti bola ke gawang
   ④ Di gawang: Beranda inti (HubScreen, di Hub.jsx)
   Animasi dibuat dengan CSS 3D/SVG (bukan three.js) supaya ringan di HP tier hemat.
   Mode Fokus / Kurangi Gerakan → perpindahan langsung tanpa animasi. */

const FLY_MS = 1100;   // kamera melaju ke depan (sedang)
const SPIN_MS = 3200;  // roda berputar
const ENTER_MS = 900;  // kamera masuk ke putaran

/* Versi 3D (three.js) dipakai bila WebGL tersedia & gerakan diizinkan; selain itu versi CSS/SVG ringan */
export function IntroScreen() {
  const can3d = use3D();
  const [failed, setFailed] = useState(false);
  return can3d && !failed ? <Intro3D onFail={() => setFailed(true)} /> : <IntroFlat />;
}

export function GuideScreen() {
  const can3d = use3D();
  const [failed, setFailed] = useState(false);
  return can3d && !failed ? <Guide3D onFail={() => setFailed(true)} /> : <GuideFlat />;
}

function IntroFlat() {
  const { student, setStudent, reset, motion } = useApp();
  const [stage, setStage] = useState('casino'); // casino → toWheel → wheel → spin → enter
  const [code, setCode] = useState('');
  const [cls, setCls] = useState('');
  const [err, setErr] = useState('');
  const [known, setKnown] = useState([]);
  const timers = useRef([]);
  const later = (fn, ms) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => () => timers.current.forEach(t => window.clearTimeout(t)), []);
  useEffect(() => { listStudents().then(setKnown).catch(() => setKnown([])); }, []);
  // kode siswa terakhir di HP ini langsung terisi (tidak perlu mengetik ulang)
  useEffect(() => { if (student) { setCode(c => c || student.code); setCls(k => k || student.classCode); } }, [student]);

  const c = normCode(code), k = normClass(cls);
  const ready = CODE_RE.test(c) && CLASS_RE.test(k);

  const enter = () => {
    if (!motion) { setStage('wheel'); return; }
    setStage('toWheel');
    later(() => setStage('wheel'), FLY_MS);
  };

  const go = async () => {
    if (!CODE_RE.test(c)) { setErr('Kode siswa: huruf lalu angka, misalnya S01, A01, atau B12.'); return; }
    if (!CLASS_RE.test(k)) { setErr('Kode kelas boleh huruf dan angka, misalnya 8A.'); return; }
    const s = await login(c, k);
    setStudent(s);
    if (!motion) { reset({ name: 'guide' }); return; }
    setStage('spin');
    later(() => setStage('enter'), SPIN_MS + 250);
    later(() => reset({ name: 'guide' }), SPIN_MS + 250 + ENTER_MS);
  };

  // Isi roda: kode yang sedang diketik di sektor 0 (tempat jarum berhenti), lalu kode lain di HP ini
  const sectors = useMemo(() => {
    const me = ready ? { code: c, cls: k } : { code: '?', cls: 'kodemu' };
    const others = known.filter(s => s.code !== c).slice(0, 7).map(s => ({ code: s.code, cls: s.classCode }));
    const list = [me, ...others];
    while (list.length < 8) list.push({ code: '?', cls: '' });
    return list;
  }, [ready, c, k, known]);

  const busy = stage === 'spin' || stage === 'enter';
  return (
    <main className={'intro-cam stage-' + stage}>
      {/* ① Meja permainan */}
      {(stage === 'casino' || stage === 'toWheel') && (
        <section className="intro-layer casino-layer" aria-hidden={stage !== 'casino'}>
          <div className="intro-title">
            <h1>MaWiYas</h1>
            <p>Meja peluang: dadu, kartu, dan kejutan</p>
          </div>
          <CasinoTable />
          <button className="btn primary intro-go" onClick={enter} disabled={stage !== 'casino'}>Masuk</button>
        </section>
      )}

      {/* ② Roda undian + kode siswa */}
      {stage !== 'casino' && (
        <section className="intro-layer wheel-layer">
          <div className="wheel-zoom">
            <div className="wheel-box">
              <span className="wheel-pointer" aria-hidden="true" />
              <Wheel sectors={sectors} spinning={stage === 'spin' || stage === 'enter'} />
            </div>
          </div>
          <form className="card form wheel-form" onSubmit={e => { e.preventDefault(); void go(); }}>
            <label htmlFor="in-code">Kode siswa</label>
            <input id="in-code" autoComplete="off" autoCapitalize="characters" maxLength={12} placeholder="A01" value={code} disabled={busy}
              onChange={e => { setCode(e.target.value); setErr(''); }} />
            <label htmlFor="in-cls">Kode kelas</label>
            <input id="in-cls" autoComplete="off" autoCapitalize="characters" maxLength={12} placeholder="8A" value={cls} disabled={busy}
              onChange={e => { setCls(e.target.value); setErr(''); }} />
            {err && <p className="fb bad">{err}</p>}
            {ready
              ? <button className="btn primary ayo" type="submit" disabled={busy}>Ayo</button>
              : <p className="note">Isi kode siswa dan kode kelasmu. Jangan pakai nama asli ya.</p>}
            {known.length > 0 && !busy && (
              <div className="row">
                {known.map(s => <button type="button" key={s.code} className="chip small" onClick={() => { setCode(s.code); setCls(s.classCode); setErr(''); }}>{s.code} · {s.classCode}</button>)}
              </div>
            )}
          </form>
        </section>
      )}
    </main>
  );
}

/* Meja hijau berbingkai kayu, 2 dadu (kubus CSS 3D) dan kipas kartu */
function CasinoTable() {
  return (
    <div className="casino" aria-hidden="true">
      <div className="casino-table">
        <div className="felt-line" />
        <div className="cards-fan">
          <PlayingCard rank="A" suit="♠" />
          <PlayingCard rank="K" suit="♥" red />
          <PlayingCard rank="7" suit="♦" red />
        </div>
      </div>
      <div className="dice-row">
        <Die3D face={5} />
        <Die3D face={3} delay />
      </div>
    </div>
  );
}

function PlayingCard({ rank, suit, red }) {
  return (
    <div className={'tcard' + (red ? ' red' : '')}>
      <span className="pc-corner">{rank}<br />{suit}</span>
      <span className="pc-suit">{suit}</span>
    </div>
  );
}

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function Die3D({ face, delay }) {
  // urutan sisi: depan, belakang, kanan, kiri, atas, bawah (sisi berhadapan berjumlah 7)
  const a = [1, 2, 3].find(x => x !== face && x !== 7 - face), b = [1, 2, 3].filter(x => x !== face && x !== 7 - face)[1];
  const faces = [face, 7 - face, a, 7 - a, b, 7 - b];
  return (
    <div className={'die3d' + (delay ? ' d2' : '')}>
      {faces.map((n, i) => (
        <div key={i} className={'die-face f' + i}>
          {Array.from({ length: 9 }, (_, j) => <span key={j} className={PIPS[n].includes(j) ? 'pip on' : 'pip'} />)}
        </div>
      ))}
    </div>
  );
}

/* Roda undian (SVG). Sektor 0 di atas; saat diputar berhenti tepat di sektor 0 (kode siswa). */
const WHEEL_COLORS = ['#BFE3F5', '#FFD6BA', '#D9CCF5', '#BDEBD6', '#FFF1B8', '#F8C8D4', '#DCEBF7', '#FDE6D3'];
function Wheel({ sectors, spinning }) {
  const n = sectors.length, step = 360 / n, R = 96;
  const pt = (deg, r) => { const a = (deg * Math.PI) / 180; return `${(Math.sin(a) * r).toFixed(2)} ${(-Math.cos(a) * r).toFixed(2)}`; };
  return (
    <svg className={'wheel' + (spinning ? ' spinning' : '')} viewBox="-100 -100 200 200" role="img" aria-label="Roda undian kode siswa">
      <circle r="99" fill="#7A4A2A" />
      {sectors.map((s, i) => {
        const a0 = i * step - step / 2, a1 = i * step + step / 2;
        return (
          <g key={i}>
            <path d={`M0 0 L${pt(a0, R)} A${R} ${R} 0 0 1 ${pt(a1, R)} Z`} fill={WHEEL_COLORS[i % WHEEL_COLORS.length]} stroke="#fff" strokeWidth="1.2" />
            <g transform={`rotate(${i * step}) translate(0 -66)`}>
              <text className="w-code" textAnchor="middle" y="0">{s.code}</text>
              {s.cls && <text className="w-cls" textAnchor="middle" y="11">{s.cls}</text>}
            </g>
          </g>
        );
      })}
      <circle r="15" fill="#fff" stroke="#7A4A2A" strokeWidth="3" />
      <circle r="5" fill="#E8863A" />
    </svg>
  );
}

/* ③ Pemain bola pemandu → tendangan ke gawang → Beranda inti */
const LINES = ['Hallo, selamat datang', 'Ayo kita mulai belajarnya!'];
function GuideFlat() {
  const { student, reset, motion } = useApp();
  const [taps, setTaps] = useState(0);       // 0: sapaan, 1: ajakan, 2: menendang
  const [goal, setGoal] = useState(false);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(t => window.clearTimeout(t)), []);

  const tap = () => {
    if (taps >= 2) return;
    const n = taps + 1;
    setTaps(n);
    if (n < 2) return;
    if (!motion) { reset({ name: 'hub' }); return; }
    timers.current.push(window.setTimeout(() => setGoal(true), 1650));
    timers.current.push(window.setTimeout(() => reset({ name: 'hub' }), 2500));
  };

  const kicking = taps >= 2;
  return (
    <main className={'guide' + (kicking ? ' kicking' : '') + (goal ? ' scored' : '')}>
      <div className="pitch-world">
        <div className="pitch-panel">
          {!kicking && (
            <div className="bubble" role="status" aria-live="polite">
              <b>{LINES[taps]}{taps === 0 && student ? `, ${student.code}!` : ''}</b>
            </div>
          )}
          <button className="athlete-btn" onClick={tap} aria-label="Ketuk pemain bola untuk lanjut">
            <Athlete />
          </button>
          <div className="ball-track" aria-hidden="true"><div className="ball-arc"><Ball /></div></div>
          {!kicking && <p className="guide-tip">Ketuk pemain bola untuk lanjut ({taps + 1}/2)</p>}
        </div>
        <div className="pitch-panel goal-panel" aria-hidden="true">
          <Goal />
          {goal && <p className="goal-text">Gol! Ayo belajar!</p>}
        </div>
      </div>
    </main>
  );
}

/* Pemain bola orisinal (bukan tokoh/atlet nyata) */
function Athlete() {
  return (
    <svg className="athlete" viewBox="0 0 120 200" aria-hidden="true">
      <ellipse cx="60" cy="194" rx="34" ry="5" fill="rgba(0,0,0,.15)" />
      <g className="leg-left"><rect x="44" y="118" width="13" height="56" rx="6" fill="#5A3B2A" /><rect x="40" y="168" width="22" height="10" rx="5" fill="#2E3440" /></g>
      <g className="leg-kick"><rect x="63" y="118" width="13" height="56" rx="6" fill="#5A3B2A" /><rect x="61" y="168" width="22" height="10" rx="5" fill="#2E3440" /></g>
      <rect x="40" y="108" width="40" height="22" rx="6" fill="#2F6F9F" />
      <rect x="38" y="58" width="44" height="56" rx="12" fill="#5B8DEF" />
      <text x="60" y="94" textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff">8</text>
      <g className="arm-wave"><rect x="78" y="62" width="11" height="40" rx="5.5" fill="#5A3B2A" /></g>
      <rect x="31" y="62" width="11" height="40" rx="5.5" fill="#5A3B2A" />
      <circle cx="60" cy="38" r="20" fill="#7A5038" />
      <path d="M40 34 Q60 8 80 34 Q72 22 60 22 Q48 22 40 34Z" fill="#2E3440" />
      <circle cx="53" cy="40" r="2.4" fill="#2E3440" /><circle cx="67" cy="40" r="2.4" fill="#2E3440" />
      <path d="M53 48 Q60 53 67 48" stroke="#2E3440" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Ball() {
  return (
    <svg className="sball" viewBox="-12 -12 24 24" aria-hidden="true">
      <circle r="11" fill="#fff" stroke="#2E3440" strokeWidth="1.4" />
      <path d="M0 -4 L3.8 -1.2 L2.4 3.2 L-2.4 3.2 L-3.8 -1.2Z" fill="#2E3440" />
      <path d="M0 -4 L0 -10 M3.8 -1.2 L9.5 -3 M2.4 3.2 L6 8.5 M-2.4 3.2 L-6 8.5 M-3.8 -1.2 L-9.5 -3" stroke="#2E3440" strokeWidth="1.1" />
    </svg>
  );
}

export function Goal({ small }) {
  return (
    <svg className={'goal' + (small ? ' small' : '')} viewBox="0 0 220 130" aria-hidden="true">
      <g className="net" stroke="#B9C2CF" strokeWidth="1">
        {Array.from({ length: 13 }, (_, i) => <line key={'v' + i} x1={14 + i * 16} y1="14" x2={14 + i * 16} y2="120" />)}
        {Array.from({ length: 7 }, (_, i) => <line key={'h' + i} x1="14" y1={14 + i * 17.6} x2="206" y2={14 + i * 17.6} />)}
      </g>
      <path d="M10 124 V10 H210 V124" fill="none" stroke="#fff" strokeWidth="7" strokeLinejoin="round" />
      <path d="M10 124 V10 H210 V124" fill="none" stroke="#D5DCE5" strokeWidth="2" />
      <rect x="0" y="122" width="220" height="5" rx="2" fill="#fff" opacity=".8" />
    </svg>
  );
}

/* ═════════════ Versi 3D ═════════════ */

/** Isi roda: kode yang sedang diketik di sektor 0 (tempat jarum berhenti), lalu kode lain di HP ini */
function useWheelForm() {
  const { student } = useApp();
  const [code, setCode] = useState('');
  const [cls, setCls] = useState('');
  const [err, setErr] = useState('');
  const [known, setKnown] = useState([]);
  useEffect(() => { listStudents().then(setKnown).catch(() => setKnown([])); }, []);
  useEffect(() => { if (student) { setCode(c => c || student.code); setCls(k => k || student.classCode); } }, [student]);
  const c = normCode(code), k = normClass(cls);
  const ready = CODE_RE.test(c) && CLASS_RE.test(k);
  const sectors = useMemo(() => {
    const me = ready ? { code: c, cls: k } : { code: '?', cls: 'kodemu' };
    return [me, ...known.filter(s => s.code !== c).slice(0, 7).map(s => ({ code: s.code, cls: s.classCode }))];
  }, [ready, c, k, known]);
  return { code, setCode, cls, setCls, err, setErr, known, c, k, ready, sectors };
}

function Intro3D({ onFail }) {
  const { setStudent, reset, settings } = useApp();
  const f = useWheelForm();
  const [stage, setStage] = useState('casino'); // casino → toWheel → wheel → spin → enter
  const eng = useRef(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  useEffect(() => { eng.current?.setSectors(f.sectors); }, [f.sectors]);

  const enter = async () => {
    setStage('toWheel');
    await eng.current?.goToWheel();
    if (alive.current) setStage('wheel');
  };
  const go = async () => {
    if (!CODE_RE.test(f.c)) { f.setErr('Kode siswa: huruf lalu angka, misalnya S01, A01, atau B12.'); return; }
    if (!CLASS_RE.test(f.k)) { f.setErr('Kode kelas boleh huruf dan angka, misalnya 8A.'); return; }
    const s = await login(f.c, f.k);
    setStudent(s);
    setStage('spin');
    await eng.current?.spin();
    if (!alive.current) return;
    setStage('enter');
    await eng.current?.dive();
    if (alive.current) reset({ name: 'guide' });
  };
  const busy = stage === 'spin' || stage === 'enter';

  return (
    <main className={'intro3d stage-' + stage}>
      <Canvas3D className="full"
        make={(o) => new IntroScene({ ...o, onDiceLand: () => { if (settings.sound) playResult('dice'); } })}
        onReady={(e) => { eng.current = e; e.setSectors(f.sectors); }} onFail={onFail} />
      {(stage === 'casino' || stage === 'toWheel') && (
        <div className="i3-casino">
          <div className="intro-title"><h1>MaWiYas</h1><p>Meja peluang: dadu, kartu, dan kejutan</p></div>
          <button className="btn primary intro-go" onClick={() => void enter()} disabled={stage !== 'casino'}>Masuk</button>
        </div>
      )}
      {stage !== 'casino' && stage !== 'toWheel' && (
        <form className="card form wheel-form i3-form" onSubmit={e => { e.preventDefault(); void go(); }}>
          <label htmlFor="in-code">Kode siswa</label>
          <input id="in-code" autoComplete="off" autoCapitalize="characters" maxLength={12} placeholder="A01" value={f.code} disabled={busy}
            onChange={e => { f.setCode(e.target.value); f.setErr(''); }} />
          <label htmlFor="in-cls">Kode kelas</label>
          <input id="in-cls" autoComplete="off" autoCapitalize="characters" maxLength={12} placeholder="8A" value={f.cls} disabled={busy}
            onChange={e => { f.setCls(e.target.value); f.setErr(''); }} />
          {f.err && <p className="fb bad">{f.err}</p>}
          {f.ready
            ? <button className="btn primary ayo" type="submit" disabled={busy}>Ayo</button>
            : <p className="note">Isi kode siswa dan kode kelasmu. Jangan pakai nama asli ya.</p>}
          {f.known.length > 0 && !busy && (
            <div className="row">
              {f.known.map(s => <button type="button" key={s.code} className="chip small" onClick={() => { f.setCode(s.code); f.setCls(s.classCode); f.setErr(''); }}>{s.code} · {s.classCode}</button>)}
            </div>
          )}
        </form>
      )}
      {stage === 'enter' && <div className="whiteout in" aria-hidden="true" />}
    </main>
  );
}

function Guide3D({ onFail }) {
  const { student, reset } = useApp();
  const [taps, setTaps] = useState(0);
  const [goal, setGoal] = useState(false);
  const eng = useRef(null);
  const bubble = useRef(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  // balon kata menempel di atas kepala pemain (mengikuti kamera)
  const place = () => {
    const e = eng.current, b = bubble.current;
    if (!e || !b) return;
    const p = e.headScreen();
    b.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -100%)`;
  };

  const tap = async () => {
    if (taps >= 2 || !eng.current) return;
    const n = taps + 1;
    setTaps(n);
    if (n === 1) { eng.current.cheer(); return; }
    await eng.current.kick();
    window.setTimeout(() => { if (alive.current) reset({ name: 'hub' }); }, 1700);
  };

  return (
    <main className="guide3d">
      <Canvas3D className="full" make={(o) => new PitchScene({ ...o, onFrame: place, onGoal: () => setGoal(true) })}
        onReady={(e) => { eng.current = e; }} onFail={onFail}>
        <button className="tap-layer" onClick={() => void tap()} aria-label="Ketuk pemain bola untuk lanjut" disabled={taps >= 2} />
      </Canvas3D>
      {taps < 2 && (
        <div ref={bubble} className="bubble b3d" role="status" aria-live="polite">
          <b>{LINES[taps]}{taps === 0 && student ? `, ${student.code}!` : ''}</b>
        </div>
      )}
      {taps < 2 && <p className="guide-tip g3d">Ketuk pemain bola untuk lanjut ({taps + 1}/2)</p>}
      {goal && <p className="goal-text g3d">Gol! Ayo belajar!</p>}
      <div className="whiteout out" aria-hidden="true" />
    </main>
  );
}
