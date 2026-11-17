import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getSetting, getStudent, setSetting } from '../data/repo';
import { startCloudSync } from '../data/cloud';

const AppCtx = createContext(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp di luar AppProvider');
  return c;
};

const DEFAULT_SETTINGS = {
  focus: false,
  reduced: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  quality: 'auto',
  sound: true,
  haptic: true,
  textScale: 1
};

export function AppProvider({ children }) {
  // Selalu dibuka dari intro meja permainan → roda undian (kode siswa terakhir sudah terisi di roda)
  const [stack, setStack] = useState([{ name: 'intro' }]);
  const [navDir, setNavDir] = useState('fwd'); // 'back' memicu transisi "mundur" (rewind)
  const [student, setStudentState] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [toastMsg, setToastMsg] = useState(null);
  const toastTimer = useRef();

  useEffect(() => {
    (async () => {
      // gabung dengan bawaan agar pengaturan dari versi lama tetap lengkap
      setSettings({ ...DEFAULT_SETTINGS, ...(await getSetting('settings', {})) });
      const last = await getSetting('lastStudent', null);
      if (last) {
        const s = await getStudent(last);
        if (s) setStudentState(s);
      }
    })();
  }, []);

  // Pencadangan ke Supabase berjalan di latar; aplikasi tetap penuh fungsi tanpa internet
  useEffect(() => startCloudSync(), []);

  const push = useCallback((r) => { setNavDir('fwd'); setStack(s => [...s, r]); window.scrollTo(0, 0); }, []);
  const replace = useCallback((r) => { setNavDir('fwd'); setStack(s => [...s.slice(0, -1), r]); }, []);
  const reset = useCallback((r) => { setNavDir('fwd'); setStack([r]); window.scrollTo(0, 0); }, []);
  const stackRef = useRef(stack); stackRef.current = stack;
  const back = useCallback(() => {
    if (stackRef.current.length <= 1) return false;
    setNavDir('back');
    setStack(s => s.slice(0, -1));
    return true;
  }, []);
  const setStudent = useCallback((s) => {
    setStudentState(s);
    void setSetting('lastStudent', s?.code ?? null);
  }, []);
  const refreshStudent = useCallback(async () => {
    if (!student) return;
    const s = await getStudent(student.code);
    if (s) setStudentState(s);
  }, [student]);
  const updateSettings = useCallback((p) => {
    setSettings(prev => { const n = { ...prev, ...p }; void setSetting('settings', n); return n; });
  }, []);
  const toast = useCallback((msg) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2800);
  }, []);

  const motion = !settings.reduced && !settings.focus; // animasi tambahan patuh Mode Fokus & Kurangi Gerakan
  const value = useMemo(() => ({
    route: stack[stack.length - 1], depth: stack.length, navDir, motion, push, replace, back, reset, student, setStudent, refreshStudent, settings, updateSettings, toast, toastMsg
  }), [stack, navDir, motion, push, replace, back, reset, student, setStudent, refreshStudent, settings, updateSettings, toast, toastMsg]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
