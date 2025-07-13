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
    Camera: {
      permissions: ['camera', 'photos']
    },
    Device: {
      permissions: ['microphone']
    },
    App: {
      launchUrl: 'https://localhost'
    }
  },
  webView: {
    allowsInlineMediaPlayback: true,
    allowsAirPlayForMediaPlayback: true,
    allowsPictureInPictureMediaPlayback: true,
    allowsBackForwardNavigationGestures: false,
    allowsLinkPreview: false,
    enableViewportScale: false,
    allowsUserScaling: false,
    minimumFontSize: 0,
    suppressesIncrementalRendering: false,
    disallowOverscroll: true
  },
  android: {
    path: '../android',
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK'
    },
    webContentsDebuggingEnabled: false,
    allowMixedContent: false,
    captureInput: true,
    webViewAssetLoader: true,
    loggingBehavior: 'none',
    useLegacyBridge: false
  },
  ios: {
    path: '../ios',
    scheme: 'App',
    limitsNavigationsToAppBoundDomains: true,
    allowsLinkPreview: false,
    handleApplicationNotifications: false,
    contentInset: 'always',
    webContentsDebuggingEnabled: false,
    allowsInlineMediaPlayback: true,
    suppressesIncrementalRendering: false,
    allowsAirPlayForMediaPlayback: true,
    allowsPictureInPictureMediaPlayback: true,
    ignoresViewportScaleLimits: false,
    allowsBackForwardNavigationGestures: false
  }
};

export default config;
