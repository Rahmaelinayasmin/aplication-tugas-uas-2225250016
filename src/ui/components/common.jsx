import { useEffect, useRef } from 'react';
import { useApp } from '../../app/store';

export function TopBar({ title, sub, right, onBack }) {
  const { back } = useApp();
  return (
    <header className="topbar">
      <button className="icon-btn" aria-label="Kembali" onClick={() => (onBack ? onBack() : back())}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <div className="topbar-title">
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      <div className="topbar-right">{right}</div>
    </header>
  );
}

/** Pecahan bertumpuk: pembilang di atas penyebut (design.md §3) */
export function Frac({ n, d, nCls, dCls, text }) {
  return (
    <span className={'frac' + (text ? ' txt' : '')}>
      <span className={nCls}>{n}</span>
      <span className={dCls}>{d}</span>
    </span>
  );
}

/** Teks konten bawaan aplikasi (statis). <ns>/<na> → warna tetap n(S)/n(A) (D5) */
export function Rich({ html, className }) {
  const out = html
    .replace(/<ns>/g, '<span class="ns-t">').replace(/<\/ns>/g, '</span>')
    .replace(/<na>/g, '<span class="na-t">').replace(/<\/na>/g, '</span>');
  return <div className={className} dangerouslySetInnerHTML={{ __html: out }} />;
}

export function ProbabilityMeter({ value, empirical }) {
  const clamp = (x) => Math.max(0, Math.min(1, x));
  return (
    <div className="meter" aria-hidden="true">
      <div className="track" />
      <span className="tick" style={{ left: '0%' }}>0 mustahil</span>
      <span className="tick" style={{ left: '50%' }}>½</span>
      <span className="tick" style={{ left: '100%' }}>1 pasti</span>
      {value !== null && <span className={'mk t' + (value > 1 || value < 0 ? ' bad' : '')} style={{ left: clamp(value) * 100 + '%' }} />}
      {empirical != null && <span className="mk e" style={{ left: clamp(empirical) * 100 + '%' }} />}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }) {
  const ref = useRef(null);
  useEffect(() => { if (open) ref.current?.focus(); }, [open]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} tabIndex={-1} ref={ref} onClick={e => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="btn ghost small" onClick={onClose}>Tutup</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>;
}
