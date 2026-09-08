import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Android wrapper for the Nilex web app.
 * The app is server-rendered, so the shell loads the published site.
 */
const config: CapacitorConfig = {
  appId: 'app.lovable.nilex',
  appName: 'Nilex',
  webDir: 'dist',
  server: {
    url: 'https://generative-course-pro.lovable.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
