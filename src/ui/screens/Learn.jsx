import { useEffect, useState } from 'react';
import { useApp } from '../../app/store';
import { LESSONS, REMEDIAL } from '../../domain/content/lessons';
import { isCorrect } from '../../domain/learning/scoring';
import { initialHint, onHintRequest, onWrongAnswer, canSkip } from '../../domain/learning/hints';
import { PRACTICE_ITEMS } from '../../domain/content/practiceItems';
import { attemptsOf, logHint, testDone, updateStudent } from '../../data/repo';
import { Rich, TopBar } from '../components/common';
import { StepInput } from '../components/StepInput';
import { Widget } from '../components/widgets';
import { Logo } from '../components/Logo';

/* ───────────── Beranda / Peta Belajar ───────────── */
export function HomeScreen() {
  const { student, push } = useApp();
  const [pre, setPre] = useState(false);
  const [practiced, setPracticed] = useState(0);
  useEffect(() => {
    if (!student) return;
    testDone(student.code, 'pretest').then(setPre);
    attemptsOf(student.code).then(a => setPracticed(new Set(a.filter(x => x.mode === 'latihan').map(x => x.itemId)).size));
  }, [student]);
  if (!student) return null;
  const done = new Set(student.lessonsDone);
  const needRemedial = (student.diagnosticScore ?? 1) < 0.7 && !student.remedialDone;
  const nextLesson = LESSONS.find(l => !done.has(l.id));
  const suggestion = needRemedial
    ? { title: 'Pecahan Kilat', sub: 'Pemanasan pecahan sebelum masuk peluang', go: () => push({ name: 'lesson', id: 'pecahan' }) }
    : nextLesson
      ? { title: `Unit ${nextLesson.no}: ${nextLesson.title}`, sub: nextLesson.goal, go: () => push({ name: 'lesson', id: nextLesson.id }) }
      : { title: 'Latihan Literasi', sub: 'Semua unit selesai. Saatnya latihan soal!', go: () => push({ name: 'practice' }) };

  return (
    <main className="screen home">
      <header className="home-head">
        <div className="brand"><Logo /><div><h1>MaWiYas</h1><p>{student.code} · kelas {student.classCode}</p></div></div>
        <button className="icon-btn" aria-label="Pengaturan" onClick={() => push({ name: 'settings' })}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>
        </button>
      </header>

      <button className="card next-card" onClick={suggestion.go}>
        <span className="label">Lanjutkan</span>
        <b>{suggestion.title}</b>
        <span>{suggestion.sub}</span>
      </button>

      <div className="menu-grid">
        <button className="menu-tile t-lesson" onClick={() => push({ name: 'lessons' })}>
          <b>Belajar Bertahap</b><span>{done.size}/{LESSONS.length} unit selesai</span>
        </button>
        <button className="menu-tile t-lab" onClick={() => push({ name: 'lab' })}>
          <b>Lab Lapangan</b><span>Koin, dadu, kartu, roda, kantong, kupon, tutup botol</span>
        </button>
        <button className="menu-tile t-practice" onClick={() => push({ name: 'practice' })}>
          <b>Latihan Literasi</b><span>{practiced}/{PRACTICE_ITEMS.length} soal dicoba</span>
        </button>
        <button className="menu-tile t-progress" onClick={() => push({ name: 'progress' })}>
          <b>Progres Saya</b><span>Lihat perkembanganmu</span>
        </button>
      </div>

      <div className="row small-links">
        <button className="btn ghost small" onClick={() => push({ name: 'glossary' })}>Kamus benda peluang</button>
        <button className="btn ghost small" onClick={() => push({ name: 'test', mode: pre ? 'posttest' : 'pretest' })}>Mode Tes (dengan guru)</button>
        <button className="btn ghost small" onClick={() => push({ name: 'teacher' })}>Guru / Peneliti</button>
      </div>
    </main>
  );
}

/* ───────────── Daftar unit ───────────── */
export function LessonsScreen() {
  const { student, push } = useApp();
  if (!student) return null;
  const done = new Set(student.lessonsDone);
  return (
    <main className="screen">
      <TopBar title="Belajar Bertahap" sub="Satu langkah per layar, sesuai kecepatanmu" />
      <ol className="lesson-list">
        {[REMEDIAL, ...LESSONS].map(l => (
          <li key={l.id}>
            <button className="card lesson-row" onClick={() => push({ name: 'lesson', id: l.id })}>
              <span className={'lesson-no' + (done.has(l.id) || (l.id === 'pecahan' && student.remedialDone) ? ' done' : '')}>{l.no === 0 ? '½' : l.no}</span>
              <span className="lesson-text"><b>{l.title}</b><small>{l.goal}</small></span>
              {(done.has(l.id) || (l.id === 'pecahan' && student.remedialDone)) && <span className="pill ok">selesai</span>}
            </button>
          </li>
        ))}
      </ol>
    </main>
  );
}

/* ───────────── Pemutar unit ───────────── */
export function LessonScreen({ id }) {
  const { student, setStudent, back, push } = useApp();
  const lesson = id === 'pecahan' ? REMEDIAL : LESSONS.find(l => l.id === id);
  const [i, setI] = useState(0);
  const [val, setVal] = useState();
  const [ok, setOk] = useState(false);
  const [hint, setHint] = useState(initialHint());
  const [fb, setFb] = useState('');
  const [finished, setFinished] = useState(false);
  useEffect(() => { setVal(undefined); setOk(false); setHint(initialHint()); setFb(''); }, [i]);
  if (!lesson || !student) return null;
  const st = lesson.steps[i];
  const quiz = st.quiz;
  const canNext = !quiz || ok || canSkip(hint);

  const finish = async () => {
    const patch = id === 'pecahan'
      ? { remedialDone: true, lessonsDone: Array.from(new Set([...student.lessonsDone, id])) }
      : { lessonsDone: Array.from(new Set([...student.lessonsDone, id])) };
    const s = await updateStudent(student.code, patch);
    if (s) setStudent(s);
    setFinished(true);
  };
  const check = () => {
    if (!quiz || val === undefined) return;
    if (isCorrect(quiz, val, [quiz])) { setOk(true); setFb('Pas!'); return; }
    const { state, autoShown } = onWrongAnswer(hint, 0);
    setHint(state);
    if (autoShown) void logHint({ studentCode: student.code, itemId: `unit-${lesson.id}`, stepNo: i + 1, level: 1, trigger: 'auto', ts: Date.now() });
    setFb(state.wrong === 1 ? 'Hmm, belum pas. Coba cek lagi ya.' : 'Belum pas. Lihat petunjuknya.');
  };

  if (finished) {
    const nextL = LESSONS.find(l => l.no === lesson.no + 1);
    return (
      <main className="screen">
        <TopBar title={lesson.title} />
        <section className="card center-card">
          <h1>Unit selesai!</h1>
          <p>{lesson.goal}.</p>
          {lesson.lab && <button className="btn" onClick={() => push({ name: 'lab', preset: lesson.lab })}>Coba di Lab Lapangan</button>}
          {nextL ? <button className="btn primary" onClick={() => { back(); push({ name: 'lesson', id: nextL.id }); }}>Lanjut ke Unit {nextL.no}</button>
                 : <button className="btn primary" onClick={() => { back(); push({ name: 'practice' }); }}>Ke Latihan Literasi</button>}
          <button className="btn ghost" onClick={() => back()}>Kembali</button>
        </section>
      </main>
    );
  }

  return (
    <main className="screen">
      <TopBar title={lesson.title} sub={`Langkah ${i + 1} dari ${lesson.steps.length}`} />
      <div className="progress-dots" aria-hidden="true">{lesson.steps.map((_, j) => <span key={j} className={j <= i ? 'on' : ''} />)}</div>
      <section className="card lesson-step" aria-live="polite">
        <h2>{st.title}</h2>
        <Rich html={st.body} className="rich" />
        {st.widget && <Widget k={st.widget} />}
        {quiz && (
          <div className="quiz">
            <p className="step-prompt">{quiz.prompt}</p>
            <StepInput key={i} step={quiz} value={val} onChange={v => { setVal(v); setFb(''); }} disabled={ok} />
            {fb && <p className={'fb ' + (ok ? 'ok' : 'bad')}>{fb}</p>}
            {hint.level > 0 && !ok && <div className="hint-box">{quiz.hints.slice(0, hint.level).map((h, j) => <p key={j}><b>Petunjuk {j + 1}</b> {h}</p>)}</div>}
            {!ok && (
              <div className="row actions-row">
                <button className="btn hint" disabled={hint.level >= 3} onClick={() => setHint(onHintRequest(hint))}>Petunjuk</button>
                <button className="btn primary grow" disabled={val === undefined} onClick={check}>Periksa</button>
              </div>
            )}
          </div>
        )}
      </section>
      {/* Kontrol tempo (F10): tidak ada pindah otomatis */}
      <nav className="step-nav">
        <button className="btn" disabled={i === 0} onClick={() => setI(i - 1)}>Ulangi langkah sebelumnya</button>
        {i + 1 < lesson.steps.length
          ? <button className="btn primary" disabled={!canNext} onClick={() => setI(i + 1)}>Lanjut</button>
          : <button className="btn primary" disabled={!canNext} onClick={finish}>Selesai</button>}
      </nav>
    </main>
  );
}
