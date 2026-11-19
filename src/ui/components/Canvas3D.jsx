import { useEffect, useRef } from 'react';
import { useApp } from '../../app/store';
import { pickTier } from '../../engine3d/Stage3D';

let glOk = null;
/** Apakah HP/browser ini bisa WebGL (dicek sekali) */
export function webglAvailable() {
  if (glOk !== null) return glOk;
  try {
    const c = document.createElement('canvas');
    glOk = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { glOk = false; }
  return glOk;
}

/** Animasi 3D tambahan dipakai bila gerakan diizinkan (bukan Mode Fokus / Kurangi Gerakan) dan WebGL tersedia */
export function use3D() {
  const { motion } = useApp();
  return motion && webglAvailable();
}

/**
 * Wadah kanvas untuk satu adegan Stage3D. Adegan dibuat sekali saat dipasang dan dibongkar saat dilepas.
 * @param {{ make: (o: any) => any, onReady?: (e: any) => void, onFail?: () => void, className?: string, children?: any }} p
 */
export function Canvas3D({ make, onReady, onFail, className, children }) {
  const { settings } = useApp();
  const box = useRef(null), cv = useRef(null);
  useEffect(() => {
    let eng = null;
    try {
      eng = make({ canvas: cv.current, container: box.current, tier: pickTier(settings.quality), autoQuality: settings.quality === 'auto' });
      onReady?.(eng);
    } catch (e) {
      console.error(e);
      onFail?.();
    }
    return () => { eng?.dispose(); };
    // adegan dibuat sekali per pemasangan
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div ref={box} className={'c3d ' + (className ?? '')}>
      <canvas ref={cv} aria-hidden="true" />
      {children}
    </div>
  );
}
