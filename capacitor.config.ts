import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sjmart.warehouse',
  appName: 'Warehouse V2',
  webDir: 'dist/warehouse-v2/browser',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    // Wajib: SignalR memakai ws:// (non-TLS) sedangkan WebView berjalan di https://localhost.
    // Tanpa ini WebView memblokir WebSocket (mixed content) sehingga Android tidak menerima event realtime.
    allowMixedContent: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;

