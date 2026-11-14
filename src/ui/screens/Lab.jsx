import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../app/store';
import { autoTier, COIN_STYLES, DIE_STYLES, LabEngine,  } from '../../engine3d/LabEngine';
import { BAG, BALL_COL, ballColor, COUPON, COUPON_COL, couponColor, couponKeys, events, fmtKey, RANKS, sample, space, SPIN, SUITS, theory,  } from '../../domain/probability/spaces';
import { gcd } from '../../domain/probability/fraction';
import { logSimulation } from '../../data/repo';
import { Frac, ProbabilityMeter, TopBar } from '../components/common';
import { FrequencyChart } from '../components/FrequencyChart';
import { playResult, vibrate } from '../sound';

const MODES = [
  { id: 'coin', label: 'Koin', dot: '#E9C46A', act: 'Lempar koin' },
  { id: 'dice', label: 'Dadu', dot: '#B9A3F0', act: 'Lempar dadu' },
  { id: 'cards', label: 'Kartu', dot: '#F4A3A8', act: 'Ambil kartu' },
  { id: 'spinner', label: 'Roda', dot: '#A9CFF2', act: 'Putar roda' },
  { id: 'bag', label: 'Kantong', dot: '#A8DDB5', act: 'Ambil bola' },
  { id: 'coupon', label: 'Kupon', dot: '#8FBEEB', act: 'Ambil kupon' },
  { id: 'cap', label: 'Tutup Botol', dot: '#F2A0A8', act: 'Lempar tutup' }
];
const CONTEXT = {
  coin: ['Kenalan dengan koin', 'Koin punya dua sisi: Angka (A) dan Gambar (G). Pada koin seimbang, keduanya sama-sama mungkin muncul. Dua koin: AG dan GA dihitung sebagai hasil berbeda.'],
  dice: ['Kenalan dengan dadu', 'Dadu punya 6 sisi bermata 1 sampai 6. Dua dadu dibedakan warnanya: ungu = dadu 1, merah muda = dadu 2. Jadi (1,6) dan (6,1) berbeda, makanya ada 6 × 6 = 36 kemungkinan.'],
  cards: ['Kenalan dengan kartu remi', 'Satu set ada 52 kartu: sekop ♠︎ dan keriting ♣︎ (hitam), hati ♥︎ dan wajik ♦︎ (merah). Tiap jenis 13 kartu: As, 2–10, J, Q, K. Di lab ini kartu dikembalikan dan dikocok lagi setiap diambil.'],
  spinner: ['Kenalan dengan roda putar', 'Jarum menunjuk bagian tempat roda berhenti. Bagian yang lebih luas lebih sering terpilih.'],
  bag: ['Kenalan dengan kantong bola', 'Ada 10 bola: 4 merah, 4 kuning, 2 hijau. Bola diambil tanpa melihat, lalu dikembalikan sebelum pengambilan berikutnya.'],
  coupon: ['Kenalan dengan kotak undian', 'Kotak A berisi 2 kupon merah dan 3 biru. Kotak B berisi 3 kupon merah dan 6 biru. Kotak B punya kupon merah lebih banyak, tapi apakah peluangnya lebih besar? Bandingkan n(A)/n(S) kedua kotak.'],
  cap: ['Kenalan dengan tutup botol', 'Tutup botol tidak simetris: bagian atasnya tertutup dan lebih berat. Jadi "telentang" dan "telungkup" TIDAK sama kemungkinannya, dan tidak ada rumus n(A)/n(S) untuknya. Satu-satunya cara memperkirakan peluangnya adalah percobaan berulang (peluang empirik).']
};
const MAX_OUT = 20000;

export function LabScreen({ preset }) {
  const { student, settings, toast } = useApp();
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const tagsRef = useRef(null);
  const engine = useRef(null);
  const [cfg, setCfg] = useState(() => ({
    mode: preset?.mode ?? 'dice',
    coinCount: preset?.mode === 'coin' && preset.count ? preset.count : 1,
    dieCount: preset?.mode === 'dice' && preset.count ? preset.count : 2,
    spinKind: 'sama', coinStyle: 'emas', dieStyle: 'klasik', couponBox: 'A'
  }));
  const [progress, setProgress] = useState(null);
  const [evIdx, setEvIdx] = useState(0);
  const [outcomes, setOutcomes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err3d, setErr3d] = useState(false);

  // pasang & bongkar mesin 3D
  useEffect(() => {
    if (!canvasRef.current || !stageRef.current || !tagsRef.current) return;
    try {
      engine.current = new LabEngine({
        canvas: canvasRef.current, container: stageRef.current, tagLayer: tagsRef.current,
        tier: settings.quality === 'auto' ? autoTier() : settings.quality, autoQuality: settings.quality === 'auto',
        focus: settings.focus, reduced: settings.reduced,
        onAutoDowngrade: () => toast('Grafik diturunkan agar tetap lancar')
      });
      engine.current.setConfig(cfg);
    } catch (e) {
      console.error(e); setErr3d(true);
    }
    return () => { engine.current?.dispose(); engine.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { engine.current?.setFocus(settings.focus); }, [settings.focus]);
  useEffect(() => { engine.current?.setReduced(settings.reduced); }, [settings.reduced]);
  useEffect(() => { engine.current?.setQuality(settings.quality === 'auto' ? autoTier() : settings.quality); }, [settings.quality]);

  const evs = useMemo(() => events(cfg), [cfg]);
  const ev = evs[Math.min(evIdx, evs.length - 1)];
  const th = useMemo(() => theory(cfg, ev), [cfg, ev]);
  const test = useCallback((k) => ev.test(k), [ev]);
  useEffect(() => { engine.current?.setEventTest(test); }, [test]);

  const change = (p) => {
    if (busy) return;
    const next = { ...cfg, ...p };
    const reset = p.mode !== undefined || p.coinCount !== undefined || p.dieCount !== undefined || p.spinKind !== undefined || p.couponBox !== undefined;
    setCfg(next); engine.current?.setConfig(next);
    if (reset) { setOutcomes([]); setEvIdx(0); }
  };

  const log = (trials, added, animated) => {
    if (!student) return;
    void logSimulation({
      studentCode: student.code, object: cfg.mode,
      variant: cfg.mode === 'coin' ? `${cfg.coinCount}koin-${cfg.coinStyle}` : cfg.mode === 'dice' ? `${cfg.dieCount}dadu-${cfg.dieStyle}` : cfg.mode === 'spinner' ? cfg.spinKind : cfg.mode === 'coupon' ? `kotak${cfg.couponBox}` : cfg.mode,
      trials, eventId: ev.id, eventCount: added.filter(ev.test).length, animated, ts: Date.now()
    });
  };
  const act = async () => {
    if (busy || !engine.current) return;
    setBusy(true);
    try {
      const { key } = await engine.current.act();
      setOutcomes(o => (o.length >= MAX_OUT ? o : [...o, key]));
      if (settings.sound && !settings.focus) playResult(cfg.mode);
      if (settings.haptic) vibrate();
      log(1, [key], true);
    } finally { setBusy(false); }
  };
  const fast = async (n) => {
    if (busy) return;
    const room = MAX_OUT - outcomes.length;
    if (room <= 0) { toast('Sudah 20.000 percobaan. Tekan Ulang untuk mulai lagi.'); return; }
    let add = [];
    engine.current?.clearTags();
    if (cfg.mode === 'cap') {
      // tidak ada rumus → setiap lemparan disimulasikan dengan fisika
      if (!engine.current) return;
      setBusy(true);
      try { add = await engine.current.simulateCaps(Math.min(n, room), d => setProgress(`Mensimulasikan ${d}/${n}…`)); }
      finally { setBusy(false); setProgress(null); }
    } else {
      for (let i = 0; i < Math.min(n, room); i++) add.push(sample(cfg));
    }
    setOutcomes(o => [...o, ...add]);
    log(add.length, add, false);
  };

  const N = outcomes.length, k = useMemo(() => outcomes.filter(test).length, [outcomes, test]);
  const g = gcd(th.nA, th.nS) || 1, pT = th.none ? null : th.nA / th.nS, pE = N ? k / N : null;
  const sp = space(cfg), lastO = outcomes[N - 1];
  const dec = (x) => x.toLocaleString('id-ID', { maximumFractionDigits: 3 });
  const listA = !th.area && sp.outcomes.length <= 6 ? ` → A = {${sp.outcomes.filter(test).map(o => fmtKey(cfg, o)).join(', ')}}` : '';
  const mode = MODES.find(m => m.id === cfg.mode);

  return (
    <div className="lab">
      <TopBar title="Lab Lapangan" sub="Konsep Dasar Peluang" />
      <nav className="tabs" role="tablist" aria-label="Benda peluang">
        {MODES.map(m => (
          <button key={m.id} role="tab" className="tab" aria-selected={m.id === cfg.mode} disabled={busy} onClick={() => change({ mode: m.id })}>
            <span className="dot" style={{ background: m.dot }} />{m.label}
          </button>
        ))}
      </nav>
      <div className="lab-main">
        <section className="stage" ref={stageRef} aria-label="Lapangan 3D">
          <canvas ref={canvasRef} />
          <div className="tags" ref={tagsRef} />
          {err3d ? <div className="stage-err">Grafik 3D tidak tersedia di HP ini. Tombol 10×, 100×, dan 1000× tetap bisa dipakai.</div>
                 : <div className="stage-hint">{settings.reduced ? 'Kurangi gerakan aktif: hasil langsung tampil' : 'Geser untuk memutar · ketuk 2× untuk kembali'}</div>}
        </section>

        <section className="panel">
          <div className="actions">
            <button className="btn primary main-act" disabled={busy || err3d} onClick={act}>{busy ? (progress ?? 'Tunggu…') : mode.act}</button>
            {(cfg.mode === 'cap' ? [10, 100] : [10, 100, 1000]).map(n => <button key={n} className="btn fast" disabled={busy || (cfg.mode === 'cap' && err3d)} onClick={() => void fast(n)}>{n}×</button>)}
            <button className="btn ghost" disabled={busy} onClick={() => { setOutcomes([]); engine.current?.clearTags(); }}>Ulang</button>
          </div>

          <Variants cfg={cfg} change={change} busy={busy} />

          <div>
            <p className="label">Kejadian A</p>
            <div className="row">{evs.map((e, i) => <button key={e.id} className="chip" aria-pressed={e === ev} onClick={() => setEvIdx(i)}>{e.label}</button>)}</div>
          </div>

          {/* D1: kejadian, rumus, dan hasil percobaan dalam satu kartu di samping lapangan */}
          <div className="card">
            <p className="event-desc">Kejadian A: <span dangerouslySetInnerHTML={{ __html: ev.desc }} />{listA}</p>
            {th.none ? (
              <div className="formula" aria-label="Peluang empirik">
                <span>P(A) ≈</span><Frac n="banyak A muncul" d="banyak percobaan" nCls="na" dCls="ns" text />
                {N > 0 && <><span className="eq">=</span><Frac n={k} d={N} nCls="na" dCls="ns" /></>}
              </div>
            ) : (
              <div className="formula" aria-label="Rumus peluang">
                <span>P(A)</span><span className="eq">=</span>
                {th.area ? <Frac n="luas bagian A" d="luas roda" nCls="na" dCls="ns" text /> : <Frac n="n(A)" d="n(S)" nCls="na" dCls="ns" />}
                <span className="eq">=</span><Frac n={th.nA} d={th.nS} nCls="na" dCls="ns" />
                {g > 1 && <><span className="eq">=</span><Frac n={th.nA / g} d={th.nS / g} /></>}
              </div>
            )}
            {th.none
              ? <p className="note">Tutup botol tidak simetris, jadi <b>tidak ada peluang teoretis</b>. Peluangnya hanya bisa diperkirakan dari banyak percobaan. Makin banyak percobaan, perkiraannya makin bisa dipercaya.</p>
              : th.area
              ? <p className="note">Bagian roda tidak sama besar, jadi tiap warna tidak sama kemungkinannya. Peluang dibandingkan dengan luas bagian, bukan banyak warna.</p>
              : <p className="note"><span className="na-t">n(A) = {th.nA}</span> hasil cocok dengan kejadian A, dari <span className="ns-t">n(S) = {th.nS}</span> semua hasil yang mungkin.</p>}
            <div className="stats">
              <div className="stat"><small>Percobaan</small><b>{N}</b></div>
              <div className="stat"><small>A muncul</small><b className="na-t">{k}</b></div>
              <div className="stat"><small>Frekuensi relatif</small><b>{N ? `${k}/${N}` : '–'}</b></div>
            </div>
            <p className="note">{N
              ? <>Hasil percobaan {k}/{N} ≈ <b>{dec(pE)}</b>.{pT !== null && <> Peluang teoretis {th.nA / g}/{th.nS / g} ≈ <b>{dec(pT)}</b>.</>}</>
              : pT === null ? 'Belum ada percobaan. Lempar tutup botol berkali-kali untuk memperkirakan peluangnya.' : 'Belum ada percobaan. Coba lempar dulu, lalu bandingkan dengan peluang teoretis.'}</p>
          </div>

          <div className="card">
            <FrequencyChart outcomes={outcomes} test={test} theory={pT} />
            <div className="legend"><span><i />frekuensi relatif (percobaan)</span>{pT !== null && <span><i className="d" />peluang teoretis</span>}</div>
            <ProbabilityMeter value={pT} empirical={pE} />
            <p className="note">{pT === null
              ? (N < 30 ? 'Garis oranye masih naik-turun. Coba 100× beberapa kali.' : `Setelah ${N} percobaan, garis oranye mulai stabil di sekitar ${dec(pE)}. Itulah perkiraan peluangnya.`)
              : N < 30 ? 'Dengan sedikit percobaan, hasilnya bisa jauh dari peluang teoretis. Coba 100× atau 1000×.'
              : `Setelah ${N} percobaan, selisihnya ${dec(Math.abs(pE - pT))}. Makin banyak percobaan, garis oranye biasanya makin dekat ke garis putus-putus.`}</p>
          </div>

          <div className="card">
            <p className="label">{th.none ? 'Hasil yang mungkin · tidak sama kemungkinannya' : <>Ruang sampel S · <span className="ns-t">n(S) = {sp.weights ? `${th.nS} bagian` : sp.outcomes.length}</span> · kotak oranye = kejadian A</>}</p>
            <SampleSpaceView cfg={cfg} test={test} last={lastO} />
            <p className="label">Hasil terakhir</p>
            <div className="hist">{N ? outcomes.slice(-14).map((x, i) => <span key={N - 14 + i} className={test(x) ? 'in' : ''}>{fmtKey(cfg, x)}</span>) : <span>belum ada</span>}</div>
          </div>

          <div className="context"><b>{CONTEXT[cfg.mode][0]}</b>{CONTEXT[cfg.mode][1]}</div>
        </section>
      </div>
    </div>
  );
}

function Variants({ cfg, change, busy }) {
  const opt = (on, label, fn) => <button key={label} className="chip opt" aria-pressed={on} disabled={busy} onClick={fn}>{label}</button>;
  if (cfg.mode === 'coin') return (
    <div className="row variants">
      {([1, 2]).map(n => opt(cfg.coinCount === n, `${n} koin`, () => change({ coinCount: n })))}
      <span className="sep" />
      {(Object.keys(COIN_STYLES)).map(s => opt(cfg.coinStyle === s, COIN_STYLES[s].name, () => change({ coinStyle: s })))}
    </div>
  );
  if (cfg.mode === 'dice') return (
    <div className="row variants">
      {([1, 2]).map(n => opt(cfg.dieCount === n, `${n} dadu`, () => change({ dieCount: n })))}
      <span className="sep" />
      {(Object.keys(DIE_STYLES)).map(s => opt(cfg.dieStyle === s, DIE_STYLES[s], () => change({ dieStyle: s })))}
    </div>
  );
  if (cfg.mode === 'spinner') return (
    <div className="row variants">
      {(['sama', 'beda']).map(s => opt(cfg.spinKind === s, s === 'sama' ? 'Bagian sama besar' : 'Bagian tidak sama', () => change({ spinKind: s })))}
    </div>
  );
  if (cfg.mode === 'coupon') return (
    <div className="row variants">
      {(['A', 'B']).map(b => opt(cfg.couponBox === b, `Kotak ${b} (${COUPON[b].merah} merah, ${COUPON[b].biru} biru)`, () => change({ couponBox: b })))}
    </div>
  );
  return null;
}

function SampleSpaceView({ cfg, test, last }) {
  if (cfg.mode === 'dice' && cfg.dieCount === 2) return (
    <>
      <div className="grid-wrap">
        <table className="grid">
          <thead><tr><th />{[1, 2, 3, 4, 5, 6].map(b => <th key={b} className="d2">{b}</th>)}</tr></thead>
          <tbody>{[1, 2, 3, 4, 5, 6].map(a => (
            <tr key={a}><th className="d1">{a}</th>{[1, 2, 3, 4, 5, 6].map(b => { const k = `${a}-${b}`; return <td key={b} className={(test(k) ? 'in' : 'shown') + (k === last ? ' last' : '')}>{a},{b}</td>; })}</tr>
          ))}</tbody>
        </table>
      </div>
      <p className="note">Baris = dadu ungu, kolom = dadu merah muda.</p>
    </>
  );
  if (cfg.mode === 'cards') return (
    <div className="grid-wrap">
      <table className="grid cards">
        <thead><tr><th />{RANKS.map(r => <th key={r}>{r}</th>)}</tr></thead>
        <tbody>{SUITS.map(s => (
          <tr key={s.k}><th className={s.red ? 'red' : ''}>{s.sym}</th>{RANKS.map(r => { const k = r + s.k; return <td key={k} className={(test(k) ? 'in' : 'shown') + (k === last ? ' last' : '')} />; })}</tr>
        ))}</tbody>
      </table>
    </div>
  );
  if (cfg.mode === 'bag') return (
    <div className="ss">{BAG.map(k => <span key={k} className={'ballcell' + (test(k) ? ' in' : '')}><span className="ball" style={{ background: BALL_COL[ballColor(k)] }} /></span>)}</div>
  );
  if (cfg.mode === 'coupon') return (
    <div className="ss">{couponKeys(cfg.couponBox ?? 'A').map(k => <span key={k} className={'ballcell' + (test(k) ? ' in' : '')}><span className="coupon-chip" style={{ background: COUPON_COL[couponColor(k)] }} /></span>)}</div>
  );
  if (cfg.mode === 'spinner') {
    const defs = SPIN[cfg.spinKind], tot = defs.reduce((a, b) => a + b.w, 0);
    return (
      <div className="ss">{defs.map(d => { const g = gcd(d.w, tot); return (
        <span key={d.c} className={'cell' + (test(d.c) ? ' in' : '') + (d.c === last ? ' last' : '')}>
          <i className="swatch" style={{ background: d.col }} />{d.c}{cfg.spinKind === 'beda' && ` · ${d.w / g}/${tot / g}`}
        </span>); })}</div>
    );
  }
  return <div className="ss">{space(cfg).outcomes.map(k => <span key={k} className={'cell' + (test(k) ? ' in' : '') + (k === last ? ' last' : '')}>{fmtKey(cfg, k)}</span>)}</div>;
}
