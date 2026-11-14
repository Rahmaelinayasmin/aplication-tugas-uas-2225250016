import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mawiyas.app',
  appName: 'MaWiYas',
  webDir: 'dist',
  android: { backgroundColor: '#FBF8F3' },
  plugins: {
    // Permintaan ke MaWiYas Server lewat jaringan native (tanpa batasan CORS/mixed content WebView)
    CapacitorHttp: { enabled: true }
  }
};

export default config;
