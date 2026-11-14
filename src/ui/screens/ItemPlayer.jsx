import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/store';
import { answerText, isCorrect, scoreItem } from '../../domain/learning/scoring';
import { canSkip, initialHint, onHintRequest, onWrongAnswer } from '../../domain/learning/hints';
import { GLOSSARY } from '../../domain/content/lessons';
import { APP_VERSION,  } from '../../data/db';
import { logHint, masteryOf, saveAttempt } from '../../data/repo';
import { Stem } from '../components/Stem';
import { StepInput } from '../components/StepInput';
import { Rich, Sheet } from '../components/common';
import { Widget } from '../components/widgets';

/* Pemutar soal: satu tahap per langkah (D4), Pola 3 Langkah (F08), petunjuk bertahap (F05), cek kewajaran (F06).
   Mode tes: tanpa petunjuk, tanpa umpan balik benar/salah, tanpa lab. */
export function ItemPlayer({ item, mode, onDone, position }) {
  const { student, push } = useApp();
  const isTest = mode !== 'latihan';
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState(new Map());
  const [value, setValue] = useState(undefined);
  const [hint, setHint] = useState(initialHint());
  const [recs, setRecs] = useState([]);
  const [fb, setFb] = useState(null);
  const [solved, setSolved] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const [mastery, setMastery] = useState(0);
  const [gloss, setGloss] = useState(null);
  const started = useRef(Date.now());
  const step = item.steps[idx];

  useEffect(() => { if (student && !isTest) masteryOf(student.code, item.indicator).then(setMastery); }, [student, item.indicator, isTest]);
  useEffect(() => { setIdx(0); setAnswers(new Map()); setValue(undefined); setHint(initialHint()); setRecs([]); setFb(null); setSolved(false); setShowModel(false); started.current = Date.now(); }, [item.id]);

  const log = (level, trigger) => {
    if (student) void logHint({ studentCode: student.code, itemId: item.id, stepNo: step.no, level, trigger, ts: Date.now() });
  };

  async function finish(finalAnswers, finalRecs) {
    if (!student) return;
    const sc = scoreItem(item, finalAnswers);
    const steps = item.steps.map((s, i) => {
      const r = sc.steps[i], rec = finalRecs[i] ?? { wrong: 0, hintLevel: 0, correct: false, skipped: true };
      // Latihan: "benar" = akhirnya diselesaikan siswa (bukan dilewati)
      const correct = isTest ? r.correct : rec.correct;
      return { no: s.no, score: isTest ? r.score : correct ? r.max : 0, max: r.max, correct, ecf: isTest ? r.ecf : false, needsReview: r.needsReview, answer: answerText(finalAnswers.get(s.no), s), wrong: rec.wrong, hintLevel: rec.hintLevel, skipped: rec.skipped };
    });
    const total = steps.reduce((a, s) => a + s.score, 0), max = steps.reduce((a, s) => a + s.max, 0);
    const hintsUsed = finalRecs.reduce((a, r) => a + r.hintLevel, 0);
    const attemptId = await saveAttempt({ studentCode: student.code, mode, itemId: item.id, indicator: item.indicator, total, max, durationMs: Date.now() - started.current, hintsUsed, steps, appVersion: APP_VERSION, ts: Date.now() });
    onDone({ total, max, solved: steps.filter(s => s.correct).length, hintsUsed, attemptId: attemptId });
  }

  function advance(rec, ans) {
    const nextAnswers = new Map(answers); if (ans !== undefined) nextAnswers.set(step.no, ans);
    const nextRecs = [...recs]; nextRecs[idx] = rec;
    setAnswers(nextAnswers); setRecs(nextRecs);
    if (idx + 1 >= item.steps.length) { void finish(nextAnswers, nextRecs); return; }
    setIdx(idx + 1); setValue(undefined); setHint(initialHint()); setFb(null); setSolved(false); setShowModel(false);
  }

  function check() {
    if (value === undefined) return;
    if (isTest) { advance({ wrong: 0, hintLevel: 0, correct: false, skipped: false }, value); return; }
    if (isCorrect(step, value, item.steps)) {
      setSolved(true);
      setFb({ kind: 'ok', text: okText(step, value) });
      return;
    }
    // Cek kewajaran: peluang > 1 (GL02)
    const over = step.check.type === 'fraction' && Array.isArray(value) && typeof value[0] === 'number' && (value)[0] > (value)[1];
    const { state, autoShown } = onWrongAnswer(hint, mastery);
    setHint(state);
    if (autoShown) log(1, 'auto');
    if (step.check.type === 'reason') {
      setFb({ kind: 'bad', text: state.wrong >= 2 ? 'Bandingkan alasanmu dengan contoh di bawah, lalu lanjutkan.' : 'Alasanmu sudah bagus, coba sebutkan juga perbandingan peluangnya.' });
      if (state.wrong >= 2) setShowModel(true);
      return;
    }
    setFb(over
      ? { kind: 'warn', text: 'Peluang tidak mungkin lebih dari 1. Cek lagi n(A) dan n(S)-mu.' }
      : { kind: 'bad', text: state.wrong === 1 ? 'Hmm, belum pas. Coba cek lagi ya.' : autoShown ? 'Yuk, kita pakai petunjuk dulu.' : 'Belum pas. Lihat petunjuknya pelan-pelan.' });
  }

  const askHint = () => { const s = onHintRequest(hint); setHint(s); log(s.level, 'manual'); };
  const rec = (correct, skipped = false) => ({ wrong: hint.wrong, hintLevel: hint.level, correct, skipped });

  return (
    <div className="item-player">
      <div className="item-head">
        <span className="pill">{position ?? `Langkah ${idx + 1} dari ${item.steps.length}`}</span>
        {!isTest && item.context?.map(g => <button key={g} className="chip small" onClick={() => setGloss(g)}>? {GLOSSARY[g].title}</button>)}
        {!isTest && item.lab && <button className="chip small" onClick={() => push({ name: 'lab', preset: { mode: item.lab.mode, count: item.lab.count } })}>Coba di Lab</button>}
      </div>

      <section className="card">
        <h2 className="item-title">{item.title}</h2>
        <Stem stem={item.stem} allowReveal={!isTest} />
      </section>

      {idx > 0 && (
        <ol className="done-steps" aria-label="Langkah selesai">
          {item.steps.slice(0, idx).map((s, i) => (
            <li key={s.no}><span>{s.prompt}</span><b>{isTest ? (answers.has(s.no) ? 'terisi' : 'dilewati') : recs[i]?.skipped ? 'dilewati' : answerText(answers.get(s.no), s)}</b></li>
          ))}
        </ol>
      )}

      <section className="card step-card" aria-live="polite">
        <p className="step-no">Tahap {step.no}</p>
        <p className="step-prompt">{step.prompt}</p>
        <StepInput key={item.id + step.no} step={step} value={value} onChange={v => { setValue(v); if (!solved) setFb(null); }} disabled={solved} />

        {fb && <p className={'fb ' + fb.kind}>{fb.text}</p>}
        {!isTest && hint.level > 0 && !solved && (
          <div className="hint-box">
            {step.hints.slice(0, hint.level).map((h, i) => <p key={i}><b>Petunjuk {i + 1}</b> {h}</p>)}
          </div>
        )}
        {showModel && step.check.type === 'reason' && <div className="hint-box model"><b>Contoh alasan</b><p>{step.check.model}</p></div>}

        <div className="row actions-row">
          {isTest ? (
            <>
              <button className="btn primary grow" disabled={value === undefined} onClick={check}>Simpan & lanjut</button>
              <button className="btn ghost" onClick={() => advance(rec(false, true), undefined)}>Lewati</button>
            </>
          ) : solved ? (
            <button className="btn primary grow" onClick={() => advance(rec(true), value)}>{idx + 1 >= item.steps.length ? 'Selesai' : 'Lanjut'}</button>
          ) : (
            <>
              <button className="btn hint" onClick={askHint} disabled={hint.level >= 3}>Petunjuk{hint.level > 0 ? ` ${Math.min(3, hint.level + 1)}` : ''}</button>
              <button className="btn primary grow" disabled={value === undefined} onClick={check}>Periksa</button>
              {(canSkip(hint) || showModel) && <button className="btn ghost" onClick={() => advance(rec(false, !showModel), value)}>{showModel ? 'Lanjut' : 'Lewati'}</button>}
            </>
          )}
        </div>
      </section>

      <Sheet open={!!gloss} onClose={() => setGloss(null)} title={gloss ? GLOSSARY[gloss].title : ''}>
        {gloss && <>
          <Rich html={GLOSSARY[gloss].body} className="rich" />
          {GLOSSARY[gloss].widget && <Widget k={GLOSSARY[gloss].widget} />}
        </>}
      </Sheet>
    </div>
  );
}

function okText(step, v) {
  const c = step.check;
  if (c.type === 'fraction' && Array.isArray(v)) {
    const [n, d] = v;
    let g = n, b = d; while (b) [g, b] = [b, g % b];
    return g > 1 ? `Pas! ${n}/${d} bisa disederhanakan menjadi ${n / g}/${d / g}.` : `Pas! Peluangnya ${n}/${d}.`;
  }
  if (c.type === 'reason') return 'Bagus! Alasanmu sudah memuat perbandingan yang tepat.';
  return 'Pas!';
}
