import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cn.jacksonz.pwa.twa.zhiweijz',
  appName: '只为记账',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  plugins: {
        SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#00000000",
      androidSplashResourceName: "splash_background",
      androidScaleType: "MATRIX",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      useDialog: false,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#FFFFFF',
      overlaysWebView: false
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    App: {
      launchUrl: 'https://localhost'
    }
  },
  android: {
    path: '../android',
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK'
    }
  },
  ios: {
    path: '../ios',
    scheme: 'App',
    limitsNavigationsToAppBoundDomains: true,
    allowsLinkPreview: false,
    handleApplicationNotifications: false,
    contentInset: 'always'
  }
};

export default config;
