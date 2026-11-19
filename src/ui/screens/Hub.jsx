import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/store';
import { attemptsOf, logRest, questDoneMap, testDone } from '../../data/repo';
import { LESSONS } from '../../domain/content/lessons';
import { mastery } from '../../domain/learning/hints';
import { ABILITY_STEPS, abilityChecks } from '../../domain/learning/ability';
import { TopBar } from '../components/common';
import { Logo } from '../components/Logo';
import { HubDoodles, TileIcon } from '../components/HubDoodles';
import { Goal } from './Intro';

/* ───────────── Beranda inti (muncul "di gawang" setelah tendangan) ───────────── */
export function HubScreen() {
  const { student, push } = useApp();
  const [pre, setPre] = useState(false);
  const [post, setPost] = useState(false);
  useEffect(() => {
    if (!student) return;
    testDone(student.code, 'pretest').then(setPre);
    testDone(student.code, 'posttest').then(setPost);
  }, [student]);
  if (!student) return null;

  const tiles = [
    { k: 'pre', t: 'Pretest', s: pre ? 'Sudah dikerjakan' : 'Tes awal bersama guru', go: () => push({ name: 'test', mode: 'pretest' }), c: 't-test', ic: 'test' },
    { k: 'post', t: 'Posttest', s: post ? 'Sudah dikerjakan' : 'Tes akhir bersama guru', go: () => push({ name: 'test', mode: 'posttest' }), c: 't-test', ic: 'testok' },
    { k: 'materi', t: 'Materi Peluang', s: `${student.lessonsDone.length}/${LESSONS.length} unit selesai`, go: () => push({ name: 'lessons' }), c: 't-lesson', ic: 'book' },
    { k: 'lab', t: 'Uji Coba', s: 'Lempar koin, dadu, ambil kartu', go: () => push({ name: 'lab' }), c: 't-lab', ic: 'dice' },
    { k: 'quest', t: 'Latihan Soal', s: 'Mudah · Sedang · Sulit', go: () => push({ name: 'quest' }), c: 't-practice', ic: 'target' },
    { k: 'literasi', t: 'Latihan Literasi', s: 'Soal cerita per langkah', go: () => push({ name: 'practice' }), c: 't-practice', ic: 'chat' },
    { k: 'ability', t: 'Kemampuan Saya', s: 'Lihat tingkatmu 1–10', go: () => push({ name: 'ability' }), c: 't-progress', ic: 'ladder' },
    { k: 'progress', t: 'Progres Saya', s: 'Kemandirian per indikator', go: () => push({ name: 'progress' }), c: 't-progress', ic: 'chart' },
    { k: 'rest', t: 'Istirahat', s: 'Capek? Rehat sebentar', go: () => push({ name: 'rest' }), c: 't-rest', ic: 'cup' },
    { k: 'kamus', t: 'Kamus Benda', s: 'Koin, dadu, kartu remi', go: () => push({ name: 'glossary' }), c: 't-lesson', ic: 'search' }
  ];

  return (
    <main className="screen hub">
      <header className="hub-head">
        <div className="hub-goal"><Goal small /></div>
        <div className="brand"><Logo /><div><h1>MaWiYas</h1><p>{student.code} · kelas {student.classCode}</p></div></div>
        <button className="icon-btn" aria-label="Pengaturan" onClick={() => push({ name: 'settings' })}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>
        </button>
      </header>

      <HubDoodles code={student.code} />

      {student.diagnosticScore === null && (
        <button className="card next-card" onClick={() => push({ name: 'diagnostic' })}>
          <span className="label">Mulai dari sini</span>
          <b>Diagnostik pecahan</b>
          <span>6 soal singkat, bukan ulangan</span>
        </button>
      )}

      <div className="menu-grid">
        {tiles.map((x, i) => (
          <button key={x.k} className={'menu-tile ' + x.c} onClick={x.go}><TileIcon name={x.ic} i={i} /><b>{x.t}</b><span>{x.s}</span></button>
        ))}
      </div>

      <div className="row small-links">
        <button className="btn ghost small" onClick={() => push({ name: 'home' })}>Peta Belajar</button>
        <button className="btn ghost small" onClick={() => push({ name: 'teacher' })}>Guru / Peneliti</button>
      </div>
    </main>
  );
}

/* ───────────── Kemampuan Saya: tangga 1–10 ───────────── */
function testScore(atts, mode) {
  const rows = atts.filter(a => a.mode === mode);
  if (!rows.length) return null;
  const latest = new Map();
  for (const a of rows) if (!latest.has(a.itemId) || latest.get(a.itemId).ts < a.ts) latest.set(a.itemId, a);
  let total = 0, max = 0;
  for (const a of latest.values()) { total += a.total; max += a.max; }
  return { total, max };
}

export function AbilityScreen() {
  const { student, push } = useApp();
  const [checks, setChecks] = useState(null);
  useEffect(() => {
    if (!student) return;
    (async () => {
      const atts = await attemptsOf(student.code);
      const prac = atts.filter(a => a.mode === 'latihan').flatMap(a => a.steps.map(s => ({ solved: s.correct, hintsUsed: s.hintLevel })));
      setChecks(abilityChecks({
        diagnosticScore: student.diagnosticScore, remedialDone: student.remedialDone,
        lessonsDone: student.lessonsDone.length, lessonsTotal: LESSONS.length,
        practiceMastery: mastery(prac),
        questDone: await questDoneMap(student.code),
        pretestDone: atts.some(a => a.mode === 'pretest'),
        posttest: testScore(atts, 'posttest')
      }));
    })();
  }, [student]);
  if (!student) return null;
  const score = checks ? checks.filter(Boolean).length : null;
  const next = checks ? ABILITY_STEPS.find((_, i) => !checks[i]) : null;

  return (
    <main className="screen">
      <TopBar title="Kemampuan Saya" sub={`${student.code} · kelas ${student.classCode}`} />
      <section className="card center-card ability-head">
        <p className="label">Tingkat kemampuanmu</p>
        <p className="ability-score"><b>{score ?? '–'}</b><span>/10</span></p>
        <div className="ability-bar" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} className={score !== null && i < score ? 'on' : ''} />)}</div>
        {next ? <p className="note">Langkah berikutnya: <b>{next.title}</b>. {next.desc}</p> : score === 10 && <p className="fb ok">Hebat! Kamu sudah mahir peluang.</p>}
      </section>
      <ol className="ability-list">
        {ABILITY_STEPS.map((s, i) => {
          const ok = !!checks?.[i];
          return (
            <li key={s.no} className={'card ability-row' + (ok ? ' ok' : '') + (next?.no === s.no ? ' next' : '')}>
              <span className="ab-no">{s.no}</span>
              <div><b>{s.title}</b><p className="note">{s.desc}</p></div>
              <span className="ab-mark" aria-label={ok ? 'tercapai' : 'belum'}>{ok ? '✓' : ''}</span>
            </li>
          );
        })}
      </ol>
      <p className="note">Tingkat ini hanya untukmu, bukan untuk dibandingkan dengan teman.</p>
      <button className="btn block" onClick={() => push({ name: 'quest' })}>Ke Latihan Soal</button>
    </main>
  );
}

/* ───────────── Istirahat ───────────── */
const REST_OPTIONS = [3, 5, 10];
export function RestScreen() {
  const { student, back, motion, toast } = useApp();
  const [minutes, setMinutes] = useState(null);
  const [left, setLeft] = useState(0);
  const started = useRef(0);
  const logged = useRef(false);

  const save = (finished) => {
    if (logged.current || !student || !started.current) return;
    logged.current = true;
    void logRest({ studentCode: student.code, plannedMin: minutes, actualMs: Date.now() - started.current, finished, ts: Date.now() });
  };
  // tetap tercatat walau siswa keluar sebelum waktunya habis
  const saveRef = useRef(save); saveRef.current = save;
  useEffect(() => () => saveRef.current(false), []);

  useEffect(() => {
    if (minutes === null) return;
    const end = Date.now() + minutes * 60_000;
    const t = window.setInterval(() => {
      const s = Math.max(0, Math.round((end - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) { window.clearInterval(t); saveRef.current(true); toast('Istirahat selesai. Yuk lanjut!'); }
    }, 250);
    return () => window.clearInterval(t);
  }, [minutes, toast]);

  const start = (m) => { started.current = Date.now(); logged.current = false; setLeft(m * 60); setMinutes(m); };
  const mm = String(Math.floor(left / 60)).padStart(2, '0'), ss = String(left % 60).padStart(2, '0');

  return (
    <main className="screen">
      <TopBar title="Istirahat" sub="Progresmu tetap tersimpan" />
      {minutes === null ? (
        <section className="card form">
          <p>Capek menjawab soal? Istirahat sebentar. Soalmu akan lanjut dari tempat terakhir.</p>
          <p className="label">Berapa lama?</p>
          <div className="row">{REST_OPTIONS.map(m => <button key={m} className="chip opt" onClick={() => start(m)}>{m} menit</button>)}</div>
        </section>
      ) : (
        <section className="card center-card rest-card">
          <div className={'breath' + (motion && left > 0 ? ' on' : '')} aria-hidden="true"><span /></div>
          <p className="rest-time" aria-live="off">{mm}:{ss}</p>
          <p>{left > 0 ? 'Tarik napas pelan… lalu hembuskan.' : 'Waktu istirahat habis. Siap lanjut?'}</p>
          <ul className="rest-tips">
            <li>Lihat benda jauh selama 20 detik.</li>
            <li>Minum air putih.</li>
            <li>Regangkan bahu dan tanganmu.</li>
          </ul>
        </section>
      )}
      <button className="btn primary block" onClick={() => { save(left === 0); back(); }}>{minutes === null ? 'Tidak jadi, lanjut belajar' : 'Lanjut belajar'}</button>
    </main>
  );
}
