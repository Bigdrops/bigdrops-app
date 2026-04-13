/// <reference types="@capacitor/app" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bigdrops.app',
  appName: 'BigDrops',
  webDir: 'dist',
  plugins: {
    App: {
      // Keep Capacitor's default back handler disabled because the app already
      // uses a custom AndroidBackHandler in the web layer.
      disableBackButtonHandler: true,
    },
  },
};

export default config;