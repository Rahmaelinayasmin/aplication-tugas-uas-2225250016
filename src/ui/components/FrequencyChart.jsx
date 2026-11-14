import { useEffect, useRef } from 'react';

/** Grafik frekuensi relatif (garis oranye) vs peluang teoretis (garis putus-putus biru) — F02, IL01 */
export function FrequencyChart({ outcomes, test, theory, height = 150 }) {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight;
      if (!w) return;
      c.width = w * dpr; c.height = h * dpr;
      const g = c.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
      const css = getComputedStyle(document.documentElement), col = (n) => css.getPropertyValue(n).trim();
      const L = 34, R = 8, T = 8, B = 20, W = w - L - R, H = h - T - B, y = (p) => T + (1 - p) * H;
      g.font = '11px ' + col('--f-num'); g.fillStyle = col('--ink-soft'); g.strokeStyle = col('--line'); g.lineWidth = 1;
      g.textAlign = 'right'; g.textBaseline = 'middle';
      for (const p of [0, 0.25, 0.5, 0.75, 1]) {
        g.beginPath(); g.moveTo(L, y(p)); g.lineTo(L + W, y(p)); g.stroke();
        g.fillText(p.toLocaleString('id-ID'), L - 5, y(p));
      }
      const N = outcomes.length;
      g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText('percobaan ke-1', L, T + H + 5);
      g.textAlign = 'right'; if (N) g.fillText(`ke-${N}`, L + W, T + H + 5);
      if (theory !== null) {
        g.setLineDash([6, 5]); g.strokeStyle = col('--ns'); g.lineWidth = 2;
        g.beginPath(); g.moveTo(L, y(theory)); g.lineTo(L + W, y(theory)); g.stroke(); g.setLineDash([]);
      }
      if (!N) return;
      const step = Math.max(1, Math.floor(N / 500));
      let cnt = 0;
      g.strokeStyle = col('--na'); g.lineWidth = 2.5; g.lineJoin = 'round'; g.beginPath();
      for (let i = 0; i < N; i++) {
        if (test(outcomes[i])) cnt++;
        if (i % step === 0 || i === N - 1) {
          const x = L + (N === 1 ? W : (i / (N - 1)) * W), yy = y(cnt / (i + 1));
          if (i === 0) g.moveTo(x, yy); else g.lineTo(x, yy);
        }
      }
      g.stroke();
      g.fillStyle = col('--na'); g.beginPath(); g.arc(L + W, y(cnt / N), 4, 0, Math.PI * 2); g.fill();
    };
    draw();
    const ro = new ResizeObserver(draw); ro.observe(c);
    return () => ro.disconnect();
  }, [outcomes, outcomes.length, test, theory]);

  return <canvas ref={ref} className="chart" style={{ height }} aria-label="Grafik frekuensi relatif" />;
}
