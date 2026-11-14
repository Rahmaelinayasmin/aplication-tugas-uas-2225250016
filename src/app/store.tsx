import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Student } from '../data/db';
import { getSetting, getStudent, setSetting } from '../data/repo';
import type { QualityTier } from '../engine3d/LabEngine';
import type { LabMode } from '../domain/probability/spaces';
import type { AttemptMode } from '../data/db';

export type Route =
  | { name: 'login' }
  | { name: 'diagnostic' }
  | { name: 'home' }
  | { name: 'lab'; preset?: { mode: LabMode; count?: 1 | 2 } }
  | { name: 'lessons' }
  | { name: 'lesson'; id: string }
  | { name: 'practice' }
  | { name: 'item'; id: string }
  | { name: 'test'; mode: Exclude<AttemptMode, 'latihan'> }
  | { name: 'survey'; context: string }
  | { name: 'progress' }
  | { name: 'teacher' }
  | { name: 'settings' }
  | { name: 'glossary' };

export interface Settings {
  focus: boolean;
  reduced: boolean;
  quality: 'auto' | QualityTier;
}

interface Ctx {
  route: Route;
  push: (r: Route) => void;
  replace: (r: Route) => void;
  back: () => boolean;
  reset: (r: Route) => void;
  student: Student | null;
  setStudent: (s: Student | null) => void;
  refreshStudent: () => Promise<void>;
  settings: Settings;
  updateSettings: (p: Partial<Settings>) => void;
  toast: (msg: string) => void;
  toastMsg: string | null;
}

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp di luar AppProvider');
  return c;
};

const DEFAULT_SETTINGS: Settings = {
  focus: false,
  reduced: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  quality: 'auto'
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Route[]>([{ name: 'login' }]);
  const [student, setStudentState] = useState<Student | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number>();

  useEffect(() => {
    (async () => {
      setSettings(await getSetting('settings', DEFAULT_SETTINGS));
      const last = await getSetting<string | null>('lastStudent', null);
      if (last) {
        const s = await getStudent(last);
        if (s) { setStudentState(s); setStack([{ name: s.diagnosticScore === null ? 'diagnostic' : 'home' }]); }
      }
    })();
  }, []);

  const push = useCallback((r: Route) => { setStack(s => [...s, r]); window.scrollTo(0, 0); }, []);
  const replace = useCallback((r: Route) => setStack(s => [...s.slice(0, -1), r]), []);
  const reset = useCallback((r: Route) => setStack([r]), []);
  const stackRef = useRef(stack); stackRef.current = stack;
  const back = useCallback(() => {
    if (stackRef.current.length <= 1) return false;
    setStack(s => s.slice(0, -1));
    return true;
  }, []);
  const setStudent = useCallback((s: Student | null) => {
    setStudentState(s);
    void setSetting('lastStudent', s?.code ?? null);
  }, []);
  const refreshStudent = useCallback(async () => {
    if (!student) return;
    const s = await getStudent(student.code);
    if (s) setStudentState(s);
  }, [student]);
  const updateSettings = useCallback((p: Partial<Settings>) => {
    setSettings(prev => { const n = { ...prev, ...p }; void setSetting('settings', n); return n; });
  }, []);
  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2800);
  }, []);

  const value = useMemo<Ctx>(() => ({
    route: stack[stack.length - 1], push, replace, back, reset, student, setStudent, refreshStudent, settings, updateSettings, toast, toastMsg
  }), [stack, push, replace, back, reset, student, setStudent, refreshStudent, settings, updateSettings, toast, toastMsg]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
