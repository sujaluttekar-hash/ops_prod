import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stayvista.butlerops',
  appName: 'SV Butler',
  // In production, Capacitor loads your live website
  // This means all updates to ops-prod.vercel.app instantly reflect in the app
  server: {
    url: 'https://ops-prod.vercel.app',
    cleartext: false,
  },
  android: {
    buildOptions: {
      releaseType: 'APK',
    },
    backgroundColor: '#141618',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#141618',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
