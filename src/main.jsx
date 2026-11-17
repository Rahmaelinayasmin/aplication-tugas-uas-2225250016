import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import './ui/theme/tokens.css';
import './ui/theme/app.css';
import './ui/theme/motion.css';
import App from './app/App';

// Font dibundel lokal (offline). Ditunggu sebelum render agar tekstur teks 3D memakai font yang benar.
async function boot() {
  try {
    await Promise.all([
      document.fonts.load('800 40px "Plus Jakarta Sans"'),
      document.fonts.load('700 30px "JetBrains Mono"')
    ]);
  } catch { /* fallback font sistem */ }
  createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
}
void boot();
