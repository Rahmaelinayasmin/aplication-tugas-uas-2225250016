import { useEffect, useState } from 'react';
import type { Answer, Step } from '../../domain/learning/types';

/** Isian jawaban untuk satu tahap, sesuai jenis pemeriksaan */
export function StepInput({ step, value, onChange, disabled }: { step: Step; value: Answer | undefined; onChange: (a: Answer | undefined) => void; disabled?: boolean }) {
  const c = step.check;
  switch (c.type) {
    case 'number':
      return <NumberInput value={typeof value === 'number' ? value : undefined} onChange={onChange} disabled={disabled} unit={c.unit} />;
    case 'fraction':
      return <FractionInput value={Array.isArray(value) && typeof value[0] === 'number' ? (value as [number, number]) : undefined} onChange={onChange} disabled={disabled} numLabel={c.numLabel} denLabel={c.denLabel} />;
    case 'set': {
      const sel = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="set-input" role="group" aria-label="Pilih anggota">
          <div className="row">
            {c.options.map(o => {
              const on = sel.includes(o);
              return <button key={o} type="button" className="chip set" aria-pressed={on} disabled={disabled}
                onClick={() => onChange(on ? sel.filter(x => x !== o) : [...sel, o])}>{o}</button>;
            })}
          </div>
          <p className="note">Terpilih: {'{'}{c.options.filter(o => sel.includes(o)).join(', ')}{'}'} · banyaknya <b>{sel.length}</b></p>
        </div>
      );
    }
    case 'choice':
      return (
        <div className="choices" role="radiogroup">
          {c.options.map((o, i) => (
            <button key={i} type="button" role="radio" aria-checked={value === i} className="choice" disabled={disabled} onClick={() => onChange(i)}>
              <span className="choice-dot" aria-hidden="true" />{o}
            </button>
          ))}
        </div>
      );
    case 'compare':
      return (
        <div className="compare">
          <span className="compare-side">{c.leftLabel}</span>
          <div className="row" role="radiogroup">
            {['<', '=', '>'].map(s => (
              <button key={s} type="button" role="radio" aria-checked={value === s} aria-label={s === '<' ? 'lebih kecil dari' : s === '>' ? 'lebih besar dari' : 'sama dengan'}
                className="chip cmp" disabled={disabled} onClick={() => onChange(s)}>{s}</button>
            ))}
          </div>
          <span className="compare-side">{c.rightLabel}</span>
        </div>
      );
    case 'reason':
      return (
        <textarea className="reason" rows={4} disabled={disabled} placeholder="Tulis alasanmu dengan kalimatmu sendiri…"
          value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value.trim() ? e.target.value : undefined)} />
      );
  }
}

function NumberInput({ value, onChange, disabled, unit }: { value?: number; onChange: (a: Answer | undefined) => void; disabled?: boolean; unit?: string }) {
  const [s, setS] = useState(value === undefined ? '' : String(value));
  useEffect(() => { if (value === undefined) setS(''); }, [value]);
  return (
    <div className="num-input">
      <input inputMode="numeric" pattern="[0-9]*" value={s} disabled={disabled} aria-label="Jawaban angka"
        onChange={e => { const v = e.target.value.replace(/[^0-9-]/g, ''); setS(v); onChange(v === '' || v === '-' ? undefined : parseInt(v, 10)); }} />
      {unit && <span>{unit}</span>}
    </div>
  );
}

function FractionInput({ value, onChange, disabled, numLabel, denLabel }: { value?: [number, number]; onChange: (a: Answer | undefined) => void; disabled?: boolean; numLabel?: string; denLabel?: string }) {
  const [n, setN] = useState(value ? String(value[0]) : '');
  const [d, setD] = useState(value ? String(value[1]) : '');
  useEffect(() => { if (!value) { setN(''); setD(''); } }, [value]);
  const emit = (ns: string, ds: string) => {
    const a = parseInt(ns, 10), b = parseInt(ds, 10);
    onChange(Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? [a, b] : undefined);
  };
  const clean = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 4);
  return (
    <div className="frac-input">
      <div className="frac-stack">
        <input inputMode="numeric" pattern="[0-9]*" className="na-in" aria-label={numLabel ?? 'pembilang'} value={n} disabled={disabled} placeholder="?"
          onChange={e => { const v = clean(e.target.value); setN(v); emit(v, d); }} />
        <span className="bar" />
        <input inputMode="numeric" pattern="[0-9]*" className="ns-in" aria-label={denLabel ?? 'penyebut'} value={d} disabled={disabled} placeholder="?"
          onChange={e => { const v = clean(e.target.value); setD(v); emit(n, v); }} />
      </div>
      {(numLabel || denLabel) && <div className="frac-labels"><span>{numLabel}</span><span>{denLabel}</span></div>}
    </div>
  );
}
