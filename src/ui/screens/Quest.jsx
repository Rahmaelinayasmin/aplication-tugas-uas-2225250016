import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/store';
import { latestRun, logHint, logQuestAnswer, saveRun } from '../../data/repo';
import { GLOSSARY } from '../../domain/content/lessons';
import { questItem, questItemsOf } from '../../domain/content/questItems';
import { LEVELS, LEVEL_IDS, answer, currentQuestionId, hintsLeft, newRun, openHint, suitRound } from '../../domain/learning/quest';
import { isCorrect } from '../../domain/learning/scoring';
import { randomInt } from '../../domain/probability/rng';
import { Rich, Sheet, TopBar } from '../components/common';
import { StepInput } from '../components/StepInput';
import { Widget } from '../components/widgets';
import { vibrate } from '../sound';

const GAME_NAME = { suit: 'Suit batu–kertas–gunting', mobil: 'Antar pekerja ke kantor', kucing: 'Kucing lapar' };
const REST_AFTER_MS = 15 * 60_000;

/* ───────────── Daftar level ───────────── */
export function QuestLevelsScreen() {
  const { student, push } = useApp();
  const [rows, setRows] = useState({});
  useEffect(() => {
    if (!student) return;
    Promise.all(LEVEL_IDS.map(l => latestRun(student.code, l))).then(rs => setRows(Object.fromEntries(LEVEL_IDS.map((l, i) => [l, rs[i]]))));
  }, [student]);
  if (!student) return null;
  return (
    <main className="screen">
      <TopBar title="Latihan Soal" sub="Jawab benar dulu sebelum lanjut" right={<button className="chip small" onClick={() => push({ name: 'rest' })}>Istirahat</button>} />
      {LEVEL_IDS.map(id => {
        const L = LEVELS[id], r = rows[id]?.run;
        const status = !r ? 'Belum dimulai'
          : r.status === 'playing' ? `Lanjut soal ${r.index + 1} dari ${L.count}`
          : r.status === 'done' ? 'Selesai ✓ · bisa diulang' : 'Belum berhasil · coba lagi';
        return (
          <button key={id} className={'card level-card lv-' + id} onClick={() => push({ name: 'questPlay', level: id })}>
            <span className="label">Level {L.no}</span>
            <b>{L.title} · {L.count} soal</b>
            <span className="note">{GAME_NAME[L.game]} · {L.hints} petunjuk per soal</span>
            <span className="note">{id === 'mudah' ? 'Nyawa 100, salah −5' : id === 'sedang' ? 'Bensin 100, salah −5. Benar maju 1 km' : 'Maksimal 5 kali salah'}</span>
            <span className={'pill' + (r?.status === 'done' ? ' ok' : '')}>{status}</span>
          </button>
        );
      })}
    </main>
  );
}

/* ───────────── Pengerjaan satu level ───────────── */
export function QuestPlayScreen({ level }) {
  const { student, push, replace, motion, settings } = useApp();
  const L = LEVELS[level];
  const [rowId, setRowId] = useState(null);
  const [run, setRun] = useState(null);
  const [shownId, setShownId] = useState(null);  // soal yang sedang tampil (tetap tampil setelah benar sampai "Lanjut")
  const [value, setValue] = useState(undefined);
  const [fb, setFb] = useState(null);
  const [solved, setSolved] = useState(false);
  const [event, setEvent] = useState(null);       // { kind: 'win'|'lose', seq }
  const [gloss, setGloss] = useState(null);
  const [showReward, setShowReward] = useState(false);
  const sessionStart = useRef(Date.now());
  const qStart = useRef(Date.now());

  // Muat progres terakhir: lanjutkan yang belum selesai, atau mulai run baru (langsung disimpan)
  useEffect(() => {
    if (!student || !L) return;
    let alive = true;
    (async () => {
      const row = await latestRun(student.code, level);
      if (!alive) return;
      if (row && row.run.status === 'playing') { setRowId(row.id); setRun(row.run); setShownId(currentQuestionId(row.run)); return; }
      const r = newRun(level, questItemsOf(level).map(q => q.id));
      const id = await saveRun(student.code, r);
      if (!alive) return;
      setRowId(id); setRun(r); setShownId(currentQuestionId(r));
    })();
    return () => { alive = false; };
  }, [student, level, L]);

  if (!student || !L) return null;
  if (!run) return <main className="screen"><TopBar title={`Level ${L.title}`} /><p className="note">Memuat progres…</p></main>;

  const q = shownId ? questItem(shownId) : null;
  const persist = (r) => { setRun(r); void saveRun(student.code, r, rowId ?? undefined); };

  const check = () => {
    if (!q || value === undefined || solved) return;
    const ok = isCorrect(q, value, [q]);
    const r = answer(run, ok);
    persist(r);
    void logQuestAnswer({ studentCode: student.code, level, questionId: q.id, correct: ok, answer: JSON.stringify(value), hintsUsed: run.hintsUsed[q.id] ?? 0, durationMs: Date.now() - qStart.current, ts: Date.now() });
    setEvent({ kind: ok ? 'win' : 'lose', seq: (event?.seq ?? 0) + 1 });
    if (settings.haptic) vibrate(ok ? 12 : 30);
    if (ok) {
      setSolved(true);
      setFb({ kind: 'ok', text: r.status === 'done' ? 'Benar! Semua soal level ini selesai.' : 'Benar! Lanjut ke soal berikutnya.' });
      if (r.status === 'done') setShowReward(true);
      return;
    }
    if (r.status === 'over') { setFb(null); return; }
    // F05: jangan tampilkan jawaban; arahkan ke petunjuk
    setFb({ kind: 'bad', text: hintsLeft(r, q.id) > 0 ? 'Belum tepat. Coba lagi, atau buka petunjuk.' : 'Belum tepat. Baca lagi soalnya pelan-pelan, lalu coba lagi.' });
  };

  const nextQuestion = () => {
    setSolved(false); setValue(undefined); setFb(null); qStart.current = Date.now();
    setShownId(currentQuestionId(run));
  };

  const askHint = () => {
    if (!q) return;
    const r = openHint(run, q.id);
    if (r === run) return;
    persist(r);
    void logHint({ studentCode: student.code, itemId: q.id, stepNo: 1, level: r.hintsUsed[q.id], trigger: 'manual', ts: Date.now() });
  };

  const restart = async () => {
    const r = newRun(level, questItemsOf(level).map(x => x.id));
    const id = await saveRun(student.code, r);
    setRowId(id); setRun(r); setShownId(currentQuestionId(r)); setSolved(false); setValue(undefined); setFb(null); setEvent(null); setShowReward(false);
    sessionStart.current = Date.now(); qStart.current = Date.now();
  };

  const used = q ? run.hintsUsed[q.id] ?? 0 : 0;
  const left = q ? hintsLeft(run, q.id) : 0;
  const suggestRest = run.status === 'playing' && (run.wrongStreak >= 3 || Date.now() - sessionStart.current > REST_AFTER_MS);
  const nextLevel = LEVEL_IDS[LEVEL_IDS.indexOf(level) + 1];
  const shownNo = q ? run.questionIds.indexOf(q.id) + 1 : run.index;

  return (
    <main className="screen quest">
      <TopBar title={`Level ${L.title}`} sub={`Soal ${Math.min(shownNo, L.count)} dari ${L.count}`}
        right={<button className="chip small" onClick={() => push({ name: 'rest' })}>Istirahat</button>} />

      <section className="card game-card" aria-label={GAME_NAME[L.game]}>
        {L.game === 'suit' && <SuitGame run={run} event={event} motion={motion} />}
        {L.game === 'mobil' && <CarGame run={run} event={event} motion={motion} />}
        {L.game === 'kucing' && <CatGame run={run} event={event} motion={motion} />}
      </section>

      {suggestRest && (
        <div className="fb warn rest-suggest">
          <span>Sepertinya kamu mulai lelah. Istirahat dulu? Progresmu aman.</span>
          <button className="btn small" onClick={() => push({ name: 'rest' })}>Istirahat</button>
        </div>
      )}

      {run.status === 'over' ? (
        <section className="card center-card">
          <h1>{L.game === 'suit' ? 'Nyawamu habis' : L.game === 'mobil' ? 'Bensinnya habis' : 'Kucingnya tertidur pulas'}</h1>
          <p>Tidak apa-apa, salah itu bagian dari belajar. Coba lagi dari soal pertama ya.</p>
          <p className="note">Tips: buka petunjuk sebelum menjawab kalau ragu.</p>
          <button className="btn primary" onClick={() => void restart()}>Coba lagi</button>
          <button className="btn ghost" onClick={() => replace({ name: 'quest' })}>Kembali ke daftar level</button>
        </section>
      ) : q && (
        <section className="card step-card" aria-live="polite">
          <div className="row">
            {q.context?.filter(g => GLOSSARY[g]).map(g => <button key={g} className="chip small" onClick={() => setGloss(g)}>? {GLOSSARY[g].title}</button>)}
          </div>
          <p className="q-stem">{q.stem}</p>
          <p className="step-prompt">{q.prompt}</p>
          <StepInput key={q.id} step={q} value={value} onChange={v => { setValue(v); if (!solved) setFb(null); }} disabled={solved} />
          {fb && <p className={'fb ' + fb.kind}>{fb.text}</p>}
          {used > 0 && !solved && (
            <div className="hint-box">
              {q.hints.slice(0, used).map((h, i) => <p key={i}><b>Petunjuk {i + 1}</b> {h}</p>)}
            </div>
          )}
          <div className="row actions-row">
            {solved ? (
              run.status === 'done'
                ? <button className="btn primary grow" onClick={() => setShowReward(true)}>Lihat hadiahmu</button>
                : <button className="btn primary grow" onClick={nextQuestion}>Lanjut</button>
            ) : (
              <>
                <button className="btn hint" onClick={askHint} disabled={left === 0}>Petunjuk ({left})</button>
                <button className="btn primary grow" disabled={value === undefined} onClick={check}>Periksa</button>
              </>
            )}
          </div>
        </section>
      )}

      {showReward && (
        <FlowerReward motion={motion}>
          {nextLevel && <button className="btn primary" onClick={() => replace({ name: 'questPlay', level: nextLevel })}>Lanjut ke level {LEVELS[nextLevel].title}</button>}
          <button className={'btn' + (nextLevel ? '' : ' primary')} onClick={() => replace({ name: 'quest' })}>Kembali ke daftar level</button>
        </FlowerReward>
      )}

      <Sheet open={!!gloss} onClose={() => setGloss(null)} title={gloss ? GLOSSARY[gloss].title : ''}>
        {gloss && <>
          <Rich html={GLOSSARY[gloss].body} className="rich" />
          {GLOSSARY[gloss].widget && <Widget k={GLOSSARY[gloss].widget} />}
        </>}
      </Sheet>
    </main>
  );
}

/* ───────────── Permainan pendamping ───────────── */

function Meter({ label, value, max, tone }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="g-meter">
      <span>{label}</span>
      <div className={'g-bar ' + tone} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}><i style={{ width: pct + '%' }} /></div>
      <b>{value}</b>
    </div>
  );
}

/** Animasi yang dipicu ulang setiap ada jawaban baru */
function useEventPhase(event, motion, ms) {
  const [phase, setPhase] = useState('idle');
  useEffect(() => {
    if (!event) return;
    if (!motion) { setPhase('show'); return; }
    setPhase('play');
    const t = window.setTimeout(() => setPhase('show'), ms);
    return () => window.clearTimeout(t);
  }, [event, motion, ms]);
  return phase;
}

const HAND = { batu: '✊', kertas: '✋', gunting: '✌️' };

/* Level Mudah: suit. Benar → suitmu menang; salah → suitmu kalah. Nyawa 100, salah −5. */
function SuitGame({ run, event, motion }) {
  const phase = useEventPhase(event, motion, 900);
  const [round, setRound] = useState(null);
  useEffect(() => { if (event) setRound(suitRound(event.kind === 'win', randomInt(3))); }, [event]);
  const reveal = phase === 'show' && round;
  return (
    <div className="suit">
      <Meter label="Nyawa" value={run.meter} max={100} tone="life" />
      <div className={'suit-arena' + (phase === 'play' ? ' shaking' : '')}>
        <Player name="Kamu" color="#5B8DEF" hand={reveal ? HAND[round.player] : '✊'} win={reveal && event.kind === 'win'} lose={reveal && event.kind === 'lose'} />
        <span className="suit-vs">VS</span>
        <Player name="Lawan" color="#E8863A" flip hand={reveal ? HAND[round.opponent] : '✊'} win={reveal && event.kind === 'lose'} lose={reveal && event.kind === 'win'} />
      </div>
      <p className="g-caption" aria-live="polite">
        {!event ? 'Jawab benar supaya suitmu menang!' : phase === 'play' ? 'Suit… batu, kertas, gunting!' :
          event.kind === 'win' ? `Kamu menang! ${cap(round?.player)} mengalahkan ${round?.opponent}.` : `Kamu kalah. ${cap(round?.opponent)} mengalahkan ${round?.player}. Nyawa −5.`}
      </p>
    </div>
  );
}
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');

function Player({ name, color, hand, flip, win, lose }) {
  return (
    <div className={'suit-player' + (flip ? ' flip' : '') + (win ? ' win' : '') + (lose ? ' lose' : '')}>
      <svg viewBox="0 0 80 96" aria-hidden="true">
        <rect x="18" y="50" width="44" height="40" rx="14" fill={color} />
        <circle cx="40" cy="32" r="20" fill="#F2C9A0" />
        <circle cx="33" cy="30" r="2.6" fill="#2E3440" /><circle cx="47" cy="30" r="2.6" fill="#2E3440" />
        <path d={win ? 'M32 39 Q40 46 48 39' : lose ? 'M32 43 Q40 37 48 43' : 'M33 40 H47'} stroke="#2E3440" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </svg>
      <span className="suit-hand" aria-hidden="true">{hand}</span>
      <b>{name}</b>
    </div>
  );
}

/* Level Sedang: pekerja berangkat ke kantor. Benar +1 km, salah −1 km. Bensin 100, salah −5. */
function CarGame({ run, event, motion }) {
  const L = LEVELS[run.level];
  const phase = useEventPhase(event, motion, 800);
  const pos = (run.km / L.count) * 100;
  return (
    <div className="car-game">
      <Meter label="Bensin" value={run.meter} max={100} tone="fuel" />
      <div className="road" aria-hidden="true">
        <span className="road-home">🏠</span>
        <span className="road-office">🏢</span>
        <div className="road-lane" />
        <div className={'car' + (phase === 'play' ? (event?.kind === 'win' ? ' drive' : ' bump') : '')} style={{ left: `calc(${pos}% * 0.78 + 4%)`, transition: motion ? 'left .8s ease-in-out' : 'none' }}>
          <svg viewBox="0 0 90 46">
            <path d="M8 30 L14 16 Q18 10 26 10 H56 Q62 10 66 16 L74 26 H82 Q86 26 86 32 V36 H4 V32 Q4 30 8 30Z" fill="#5B8DEF" />
            <path d="M20 16 Q22 13 26 13 H40 V25 H16Z" fill="#DCEBF7" /><path d="M44 13 H55 Q59 13 62 17 L67 25 H44Z" fill="#DCEBF7" />
            <circle cx="30" cy="20" r="5" fill="#F2C9A0" /><rect x="25" y="14" width="10" height="3" rx="1.5" fill="#2E3440" />
            <g className="wheel-g"><circle cx="22" cy="37" r="7" fill="#2E3440" /><circle cx="22" cy="37" r="2.5" fill="#D5DCE5" /></g>
            <g className="wheel-g"><circle cx="68" cy="37" r="7" fill="#2E3440" /><circle cx="68" cy="37" r="2.5" fill="#D5DCE5" /></g>
          </svg>
        </div>
      </div>
      <p className="g-caption" aria-live="polite">
        Jarak ke kantor: <b>{run.km} km</b> dari {L.count} km.{' '}
        {event && phase !== 'idle' ? (event.kind === 'win' ? 'Mobil maju 1 km!' : 'Mobil mundur 1 km, bensin −5.') : 'Jawab benar supaya mobil maju.'}
      </p>
    </div>
  );
}

/* Level Sulit: kucing lapar. Benar → makan; salah → tidur. Maksimal 5 kali salah. */
function CatGame({ run, event, motion }) {
  const phase = useEventPhase(event, motion, 1600);
  const mood = !event ? 'idle' : event.kind === 'win' ? (phase === 'play' ? 'eat' : 'happy') : 'sleep';
  const max = LEVELS[run.level].maxWrong;
  return (
    <div className="cat-game">
      <div className="g-meter">
        <span>Tertidur</span>
        <div className="moons" aria-label={`Salah ${run.wrong} dari ${max}`}>{Array.from({ length: max }, (_, i) => <i key={i} className={i < run.wrong ? 'on' : ''}>☾</i>)}</div>
        <b>{run.wrong}/{max}</b>
      </div>
      <div className={'cat-scene mood-' + mood} aria-hidden="true">
        <svg viewBox="0 0 200 110">
          <ellipse cx="150" cy="98" rx="28" ry="7" fill="#E7DFD2" />
          <path d="M124 92 Q150 104 176 92 L172 84 H128Z" fill="#E8863A" />
          <g className="fish"><ellipse cx="150" cy="82" rx="12" ry="5" fill="#7FB3E8" /><path d="M160 82 L168 77 V87Z" fill="#7FB3E8" /></g>
          <g className="cat">
            <ellipse cx="80" cy="80" rx="38" ry="22" fill="#F4B266" />
            <path d="M42 80 Q20 70 28 52" stroke="#F4B266" strokeWidth="8" fill="none" strokeLinecap="round" className="tail" />
            <g className="cat-head">
              <circle cx="112" cy="58" r="22" fill="#F4B266" />
              <path d="M95 44 L98 26 L110 38Z M129 44 L126 26 L114 38Z" fill="#F4B266" />
              <g className="eyes-open"><circle cx="104" cy="56" r="3" fill="#2E3440" /><circle cx="120" cy="56" r="3" fill="#2E3440" /></g>
              <g className="eyes-closed" stroke="#2E3440" strokeWidth="2" fill="none" strokeLinecap="round"><path d="M100 57 Q104 60 108 57" /><path d="M116 57 Q120 60 124 57" /></g>
              <path d="M109 64 Q112 67 115 64" stroke="#2E3440" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            </g>
          </g>
          <g className="zzz" fill="#6A55B0" fontWeight="800"><text x="130" y="30" fontSize="12">z</text><text x="140" y="20" fontSize="15">z</text><text x="152" y="8" fontSize="18">Z</text></g>
        </svg>
      </div>
      <p className="g-caption" aria-live="polite">
        {mood === 'idle' ? 'Kucingnya lapar. Jawab benar supaya ia bisa makan!' : mood === 'sleep' ? 'Jawaban belum tepat, kucingnya tertidur. Ayo bangunkan dengan jawaban benar!' : 'Nyam! Kucingnya makan dengan lahap.'}
      </p>
    </div>
  );
}

/* ───────────── Penghargaan: bunga biru, merah muda, kuning, putih ───────────── */
const FLOWERS = [
  { x: 10, c: '#7FB3E8', s: 1.0, d: 0 }, { x: 24, c: '#F4A6C0', s: 0.8, d: 0.15 }, { x: 38, c: '#F7D774', s: 1.1, d: 0.3 },
  { x: 52, c: '#FFFFFF', s: 0.9, d: 0.45 }, { x: 66, c: '#F4A6C0', s: 1.05, d: 0.6 }, { x: 80, c: '#7FB3E8', s: 0.85, d: 0.75 },
  { x: 92, c: '#F7D774', s: 0.75, d: 0.9 }
];
export function FlowerReward({ motion, children }) {
  return (
    <div className="reward-backdrop" role="dialog" aria-label="Penghargaan">
      <div className={'reward' + (motion ? ' bloom' : '')}>
        <div className="flower-bed" aria-hidden="true">
          {FLOWERS.map((f, i) => (
            <svg key={i} className="flower" viewBox="-30 -30 60 120" style={{ left: f.x + '%', '--s': f.s, '--d': f.d + 's' }}>
              <path d="M0 8 Q-4 50 2 88" stroke="#7DBA74" strokeWidth="4" fill="none" />
              <ellipse cx="-10" cy="58" rx="10" ry="4.5" fill="#8EC48A" transform="rotate(-30 -10 58)" />
              <g className="petals">
                {Array.from({ length: 6 }, (_, k) => (
                  <ellipse key={k} cx="0" cy="-13" rx="8" ry="14" fill={f.c} stroke={f.c === '#FFFFFF' ? '#D9CCF5' : 'none'} strokeWidth="1.2" transform={`rotate(${k * 60})`} />
                ))}
                <circle r="7" fill={f.c === '#F7D774' ? '#E8863A' : '#F7D774'} />
              </g>
            </svg>
          ))}
        </div>
        <p className="reward-text">Selamat ya sudah selesai mengerjakan nya, semogaa hari harimu dipenuhi kabar baik💗</p>
        <div className="reward-actions">{children}</div>
      </div>
    </div>
  );
}
