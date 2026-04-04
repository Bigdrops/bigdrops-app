/// <reference types="@capacitor/app" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bigdrops.app',
  appName: 'BigDrops',
  webDir: 'dist',
  plugins: {
    App: {
      disableBackButtonHandler: true,
    },
  },
};

export default config;
