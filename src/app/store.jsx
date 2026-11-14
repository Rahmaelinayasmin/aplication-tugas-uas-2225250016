import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getSetting, getStudent, setSetting } from '../data/repo';

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
  const [stack, setStack] = useState([{ name: 'login' }]);
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
        if (s) { setStudentState(s); setStack([{ name: s.diagnosticScore === null ? 'diagnostic' : 'home' }]); }
      }
    })();
  }, []);

  const push = useCallback((r) => { setStack(s => [...s, r]); window.scrollTo(0, 0); }, []);
  const replace = useCallback((r) => setStack(s => [...s.slice(0, -1), r]), []);
  const reset = useCallback((r) => setStack([r]), []);
  const stackRef = useRef(stack); stackRef.current = stack;
  const back = useCallback(() => {
    if (stackRef.current.length <= 1) return false;
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

  const value = useMemo(() => ({
    route: stack[stack.length - 1], push, replace, back, reset, student, setStudent, refreshStudent, settings, updateSettings, toast, toastMsg
  }), [stack, push, replace, back, reset, student, setStudent, refreshStudent, settings, updateSettings, toast, toastMsg]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
