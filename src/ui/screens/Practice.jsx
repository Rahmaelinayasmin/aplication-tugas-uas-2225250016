import { useEffect, useState } from 'react';
import { useApp } from '../../app/store';
import { PRACTICE_ITEMS } from '../../domain/content/practiceItems';
import { TEST_ITEMS, TEST_MAX } from '../../domain/content/testItems';
import { SURVEY } from '../../domain/content/lessons';
import { INDICATORS } from '../../domain/learning/types';
import { db } from '../../data/db';
import { attemptsOf, getSetting, saveSurvey, testDone } from '../../data/repo';
import { TopBar } from '../components/common';
import { ItemPlayer } from './ItemPlayer';

/* ───────────── Daftar latihan per indikator ───────────── */
export function PracticeScreen() {
  const { student, push } = useApp();
  const [atts, setAtts] = useState([]);
  useEffect(() => { if (student) attemptsOf(student.code).then(a => setAtts(a.filter(x => x.mode === 'latihan'))); }, [student]);
  const best = (id) => {
    const rows = atts.filter(a => a.itemId === id);
    return rows.length ? Math.max(...rows.map(a => a.steps.filter(s => s.correct && s.hintLevel === 0).length)) : null;
  };
  return (
    <main className="screen">
      <TopBar title="Latihan Literasi" sub="Bantuan muncul kalau kamu mentok" />
      {INDICATORS.map(ind => (
        <section key={ind.id} className="practice-group">
          <h2>{ind.short} <small>{ind.name}</small></h2>
          <p className="note">{ind.desc}</p>
          <div className="item-list">
            {PRACTICE_ITEMS.filter(it => it.indicator === ind.id).map(it => {
              const b = best(it.id);
              return (
                <button key={it.id} className="card item-row" onClick={() => push({ name: 'item', id: it.id })}>
                  <b>{it.title}</b>
                  <span className="note">{it.steps.length} langkah</span>
                  {b !== null && <span className={'pill' + (b === it.steps.length ? ' ok' : '')}>{b}/{it.steps.length} mandiri</span>}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}

export function ItemScreen({ id }) {
  const { replace, back } = useApp();
  const item = PRACTICE_ITEMS.find(i => i.id === id);
  const [out, setOut] = useState(null);
  useEffect(() => setOut(null), [id]);
  if (!item) return null;
  const i = PRACTICE_ITEMS.indexOf(item), next = PRACTICE_ITEMS[i + 1];
  return (
    <main className="screen">
      <TopBar title={item.title} sub={INDICATORS.find(x => x.id === item.indicator).short} />
      {out ? (
        <section className="card center-card">
          <h1>{out.solved === item.steps.length ? (out.hintsUsed === 0 ? 'Mandiri penuh!' : 'Selesai!') : 'Sudah dicoba!'}</h1>
          <p>{out.solved} dari {item.steps.length} langkah terselesaikan{out.hintsUsed ? `, memakai ${out.hintsUsed} petunjuk` : ' tanpa petunjuk'}.</p>
          <p className="note">Petunjuk akan makin jarang muncul kalau kamu makin mahir.</p>
          {(item.indicator === 'reasoning' || item.indicator === 'interpreting') && <ExplainCard attemptId={out.attemptId} />}
          {next && <button className="btn primary" onClick={() => replace({ name: 'item', id: next.id })}>Soal berikutnya: {next.title}</button>}
          <button className="btn" onClick={() => setOut(null)}>Ulangi soal ini</button>
          <button className="btn ghost" onClick={() => back()}>Kembali ke daftar</button>
        </section>
      ) : <ItemPlayer item={item} mode="latihan" onDone={setOut} />}
    </main>
  );
}

/* F07 "Jelaskan ke teman" (GL04): menjelaskan memperkuat pemahaman. Opsional, tidak dinilai. */
function ExplainCard({ attemptId }) {
  const { toast } = useApp();
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  if (saved) return <p className="fb ok">Penjelasanmu tersimpan. Menjelaskan ke teman bikin pemahamanmu makin nempel!</p>;
  return (
    <div className="explain">
      <label htmlFor="explain" className="step-prompt">Jelaskan ke teman</label>
      <p className="note">Bayangkan temanmu belum paham soal ini. Tulis 1–2 kalimat: kenapa jawabanmu benar?</p>
      <textarea id="explain" className="reason" rows={3} value={text} onChange={e => setText(e.target.value)} placeholder="Karena peluangnya …" />
      <button className="btn" disabled={text.trim().length < 5} onClick={async () => {
        await db.attempts.update(attemptId, { explanation: text.trim() }); setSaved(true); toast('Penjelasan tersimpan');
      }}>Simpan penjelasan</button>
    </div>
  );
}

/* ───────────── Mode Tes (pretest/posttest, Tabel 2) ───────────── */
export function TestScreen({ mode }) {
  const { student, replace, back } = useApp();
  const [phase, setPhase] = useState('pin');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [chosen, setChosen] = useState(mode);
  const [already, setAlready] = useState(false);
  const [i, setI] = useState(0);
  useEffect(() => { if (student) testDone(student.code, chosen).then(setAlready); }, [student, chosen]);
  if (!student) return null;

  const checkPin = async () => {
    const real = await getSetting('teacherPin', '1234');
    if (pin === real) setPhase('intro'); else setErr('PIN salah. Mode Tes dibuka oleh guru atau peneliti.');
  };

  if (phase === 'pin') return (
    <main className="screen">
      <TopBar title="Mode Tes" />
      <section className="card form">
        <p>Mode Tes dikerjakan di kelas bersama guru. Minta guru memasukkan PIN.</p>
        <label htmlFor="pin">PIN guru</label>
        <input id="pin" type="password" inputMode="numeric" value={pin} onChange={e => { setPin(e.target.value); setErr(''); }} />
        {err && <p className="fb bad">{err}</p>}
        <button className="btn primary" onClick={checkPin}>Buka</button>
      </section>
    </main>
  );
  if (phase === 'intro') return (
    <main className="screen">
      <TopBar title="Mode Tes" />
      <section className="card form">
        <p className="label">Jenis tes</p>
        <div className="row">
          {(['pretest', 'posttest']).map(m => <button key={m} className="chip opt" aria-pressed={chosen === m} onClick={() => setChosen(m)}>{m === 'pretest' ? 'Pretest' : 'Posttest'}</button>)}
        </div>
        {already && <p className="fb warn">{student.code} sudah pernah mengerjakan {chosen}. Mengerjakan lagi akan menambah data baru.</p>}
        <p>Ada <b>{TEST_ITEMS.length} soal</b>, masing-masing 6 tahap (skor maksimum {TEST_MAX}). Selama tes tidak ada petunjuk dan tidak ada tanda benar/salah. Kerjakan sendiri ya.</p>
        <button className="btn primary" onClick={() => setPhase('run')}>Mulai {chosen}</button>
      </section>
    </main>
  );
  if (phase === 'done') return (
    <main className="screen">
      <section className="card center-card">
        <h1>Terima kasih!</h1>
        <p>Jawabanmu sudah tersimpan. Terakhir, ada 10 pernyataan singkat tentang pengalaman belajarmu.</p>
        <button className="btn primary" onClick={() => replace({ name: 'survey', context: chosen })}>Isi kuesioner</button>
        <button className="btn ghost" onClick={() => back()}>Nanti saja</button>
      </section>
    </main>
  );
  const item = TEST_ITEMS[i];
  return (
    <main className="screen">
      <TopBar title={chosen === 'pretest' ? 'Pretest' : 'Posttest'} sub={`Soal ${i + 1} dari ${TEST_ITEMS.length}`} onBack={() => setPhase('intro')} />
      <ItemPlayer key={item.id} item={item} mode={chosen} position={`Soal ${i + 1}/${TEST_ITEMS.length}`}
        onDone={() => { if (i + 1 < TEST_ITEMS.length) setI(i + 1); else setPhase('done'); }} />
    </main>
  );
}

/* ───────────── Kuesioner beban kognitif (adaptasi, belum tervalidasi) ───────────── */
export function SurveyScreen({ context }) {
  const { student, back, toast } = useApp();
  const [ans, setAns] = useState({});
  if (!student) return null;
  const complete = SURVEY.items.every(it => ans[it.id] !== undefined);
  const submit = async () => {
    await saveSurvey({ studentCode: student.code, instrument: SURVEY.id, context, answers: ans, ts: Date.now() });
    toast('Kuesioner tersimpan. Terima kasih!');
    back();
  };
  return (
    <main className="screen">
      <TopBar title="Kuesioner Singkat" sub="Tidak ada jawaban benar atau salah" />
      <p className="note">Geser dari <b>0 = sangat tidak setuju</b> sampai <b>10 = sangat setuju</b>.</p>
      {SURVEY.items.map((it, n) => (
        <section key={it.id} className="card survey-item">
          <label htmlFor={'sv-' + it.id}>{n + 1}. {it.text}</label>
          <div className="survey-scale">
            <input id={'sv-' + it.id} type="range" min={0} max={10} step={1} value={ans[it.id] ?? 5}
              className={ans[it.id] === undefined ? 'untouched' : ''}
              onChange={e => setAns(a => ({ ...a, [it.id]: Number(e.target.value) }))}
              // ketuk tanpa menggeser (mis. memilih 5 yang sudah di tengah) tetap tercatat sebagai jawaban
              onPointerUp={e => { const v = Number((e.target).value); setAns(a => ({ ...a, [it.id]: v })); }}
              onKeyUp={e => { const v = Number((e.target).value); setAns(a => ({ ...a, [it.id]: v })); }} />
            <b className="survey-val">{ans[it.id] ?? '–'}</b>
          </div>
        </section>
      ))}
      <button className="btn primary block" disabled={!complete} onClick={submit}>{complete ? 'Kirim' : `Jawab semua (${Object.keys(ans).length}/${SURVEY.items.length})`}</button>
    </main>
  );
}
