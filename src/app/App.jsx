import { useEffect, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AppProvider, useApp } from './store';
import { DiagnosticScreen, LoginScreen } from '../ui/screens/Start';
import { HomeScreen, LessonScreen, LessonsScreen } from '../ui/screens/Learn';
import { ItemScreen, PracticeScreen, SurveyScreen, TestScreen } from '../ui/screens/Practice';
import { GlossaryScreen, ProgressScreen, SettingsScreen, TeacherScreen } from '../ui/screens/Other';
import { LabScreen } from '../ui/screens/Lab';
import { GuideScreen, IntroScreen } from '../ui/screens/Intro';
import { AbilityScreen, HubScreen, RestScreen } from '../ui/screens/Hub';
import { QuestLevelsScreen, QuestPlayScreen } from '../ui/screens/Quest';

function Router() {
  const { route, back, toastMsg, settings, depth, navDir, motion } = useApp();
  const backRef = useRef(back); backRef.current = back;

  // Ukuran teks (aksesibilitas): diskalakan lewat variabel CSS pada layar & panel Lab
  useEffect(() => { document.documentElement.style.setProperty('--text-zoom', String(settings.textScale)); }, [settings.textScale]);
  // Animasi tambahan (intro, transisi kembali, permainan) mati saat Mode Fokus / Kurangi Gerakan
  useEffect(() => { document.documentElement.dataset.motion = motion ? 'on' : 'off'; }, [motion]);

  // Tombol Back Android: kembali satu layar; di layar paling awal → keluar aplikasi
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const h = CapApp.addListener('backButton', () => { if (!backRef.current()) void CapApp.exitApp(); });
    return () => { void h.then(x => x.remove()); };
  }, []);

  let screen;
  switch (route.name) {
    case 'intro': screen = <IntroScreen />; break;
    case 'guide': screen = <GuideScreen />; break;
    case 'hub': screen = <HubScreen />; break;
    case 'quest': screen = <QuestLevelsScreen />; break;
    case 'questPlay': screen = <QuestPlayScreen key={route.level} level={route.level} />; break;
    case 'ability': screen = <AbilityScreen />; break;
    case 'rest': screen = <RestScreen />; break;
    case 'login': screen = <LoginScreen />; break;
    case 'diagnostic': screen = <DiagnosticScreen />; break;
    case 'home': screen = <HomeScreen />; break;
    case 'lab': screen = <LabScreen preset={route.preset} />; break;
    case 'lessons': screen = <LessonsScreen />; break;
    case 'lesson': screen = <LessonScreen key={route.id} id={route.id} />; break;
    case 'practice': screen = <PracticeScreen />; break;
    case 'item': screen = <ItemScreen key={route.id} id={route.id} />; break;
    case 'test': screen = <TestScreen mode={route.mode} />; break;
    case 'survey': screen = <SurveyScreen context={route.context} />; break;
    case 'progress': screen = <ProgressScreen />; break;
    case 'teacher': screen = <TeacherScreen />; break;
    case 'settings': screen = <SettingsScreen />; break;
    case 'glossary': screen = <GlossaryScreen />; break;
  }
  // Transisi "kembali": kamera seolah memutar mundur (rewind) sambil bergeser cepat ke kiri
  const viewKey = `${depth}:${route.name}:${route.id ?? route.level ?? route.mode ?? ''}`;
  const backing = navDir === 'back' && motion;
  return (
    <>
      {backing && <div key={'fx' + viewKey} className="rewind-fx" aria-hidden="true"><span>⏪</span></div>}
      <div key={viewKey} className={'nav-view' + (backing ? ' nav-back' : '')}>{screen}</div>
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </>
  );
}

export default function App() {
  return <AppProvider><Router /></AppProvider>;
}
