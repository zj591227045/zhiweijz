import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cn.jacksonz.pwa.twa.zhiweijz',
  appName: '只为记账',
  webDir: 'out',
  server: {
    // 移除androidScheme配置，使用默认的http scheme
    // androidScheme: 'https' // 这可能导致网络请求问题
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
    allowsBackForwardNavigationGestures: false, // 禁用默认手势，使用自定义处理
    allowsLinkPreview: false,
    enableViewportScale: false,
    allowsUserScaling: false,
    minimumFontSize: 0,
    suppressesIncrementalRendering: false,
    disallowOverscroll: true,
    // 添加自定义配置以支持后退按钮处理
    overrideUserAgent: false,
    appendUserAgent: 'ZhiWeiJZ-Mobile-App'
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
    allowMixedContent: true, // 允许混合内容，解决HTTPS/HTTP混合问题
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
    webContentsDebuggingEnabled: true,
    allowsInlineMediaPlayback: true,
    suppressesIncrementalRendering: false,
    allowsAirPlayForMediaPlayback: true,
    allowsPictureInPictureMediaPlayback: true,
    ignoresViewportScaleLimits: false,
    allowsBackForwardNavigationGestures: false, // 禁用iOS默认手势
    // 添加iOS特定配置
    preferredContentMode: 'mobile',
    scrollEnabled: true
  }
};

export default config;
