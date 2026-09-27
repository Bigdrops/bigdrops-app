/// <reference types="@capacitor/app" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bigdrops.app',
  appName: 'BigDrops',
  webDir: 'dist',
  android: {
    // Release logging stays on so sanitized diagnostics (reason codes only,
    // no secrets) reach ADB logcat on physical test-release devices.
    // Default 'debug' silences all Capacitor/WebView console output in
    // signed non-debuggable builds. Remote WebView debugging stays off.
    loggingBehavior: 'production',
  },
  plugins: {
    App: {
      // Must be false so the OnBackPressedCallback is enabled and the
      // 'backButton' event reaches JavaScript where AndroidBackHandler
      // handles navigation, overlay dismissal, and double-back exit.
      disableBackButtonHandler: false,
    },
    SystemBars: {
      insetsHandling: 'css',
      style: 'DEFAULT',
      hidden: false,
    },
  },
};

export default config;