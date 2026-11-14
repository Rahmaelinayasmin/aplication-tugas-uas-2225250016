import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Capacitor memuat dari file lokal
  build: { target: 'es2020', chunkSizeWarningLimit: 1200 },
  test: { environment: 'node', include: ['tests/**/*.test.js'] }
});
