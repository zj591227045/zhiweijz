/**
 * Android平台检测和适配工具
 */

/**
 * 检测是否为Android设备
 */
export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent.toLowerCase();
  return userAgent.includes('android');
}

/**
 * 检测是否为Capacitor应用
 */
export function isCapacitorApp(): boolean {
  if (typeof window === 'undefined') return false;

  return !!(window as any).Capacitor;
}

/**
 * 检测是否为Android Capacitor应用
 */
export function isAndroidCapacitorApp(): boolean {
  return isAndroidDevice() && isCapacitorApp();
}

/**
 * 获取Android版本号
 */
export function getAndroidVersion(): number | null {
  if (typeof window === 'undefined') return null;

  const userAgent = window.navigator.userAgent;
  const match = userAgent.match(/Android (\d+(?:\.\d+)?)/);

  return match ? parseFloat(match[1]) : null;
}

/**
 * 检测是否为Android平板
 */
export function isAndroidTablet(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent.toLowerCase();
  return userAgent.includes('android') && !userAgent.includes('mobile');
}

/**
 * 获取状态栏高度
 */
export function getStatusBarHeight(): number {
  if (!isAndroidCapacitorApp()) return 0;

  // Android标准状态栏高度
  return 24;
}

/**
 * 获取导航栏高度
 */
export function getNavigationBarHeight(): number {
  if (!isAndroidCapacitorApp()) return 0;

  // Android标准导航栏高度
  return 48;
}

/**
 * 应用Android平台样式
 */
export function applyAndroidStyles(): void {
  if (typeof window === 'undefined') return;

  const isAndroid = isAndroidCapacitorApp();

  if (isAndroid) {
    document.body.classList.add('android-app');

    // 添加Android版本类
    const version = getAndroidVersion();
    if (version) {
      document.body.classList.add(`android-${Math.floor(version)}`);
    }

    // 添加设备类型类
    if (isAndroidTablet()) {
      document.body.classList.add('android-tablet');
    } else {
      document.body.classList.add('android-phone');
    }

    // 设置CSS变量
    document.documentElement.style.setProperty('--status-bar-height', `${getStatusBarHeight()}px`);
    document.documentElement.style.setProperty(
      '--navigation-bar-height',
      `${getNavigationBarHeight()}px`,
    );

    console.log('🤖 Android平台样式已应用');
  }
}

/**
 * 移除Android平台样式
 */
export function removeAndroidStyles(): void {
  if (typeof window === 'undefined') return;

  document.body.classList.remove('android-app', 'android-tablet', 'android-phone');

  // 移除版本类
  const classes = Array.from(document.body.classList);
  classes.forEach((className) => {
    if (className.startsWith('android-')) {
      document.body.classList.remove(className);
    }
  });

  // 移除CSS变量
  document.documentElement.style.removeProperty('--status-bar-height');
  document.documentElement.style.removeProperty('--navigation-bar-height');
}

/**
 * 处理Android状态栏
 */
export async function handleAndroidStatusBar(): Promise<void> {
  if (!isAndroidCapacitorApp()) return;

  try {
    const { StatusBar } = (window as any).Capacitor.Plugins;

    if (StatusBar) {
      // 设置状态栏样式
      await StatusBar.setStyle({ style: 'LIGHT' });
      await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
      await StatusBar.setOverlaysWebView({ overlay: true });

      console.log('🤖 Android状态栏配置完成');
    }
  } catch (error) {
    console.warn('Android状态栏配置失败:', error);
  }
}

/**
 * 处理Android启动画面
 */
export async function handleAndroidSplashScreen(): Promise<void> {
  if (!isAndroidCapacitorApp()) return;

  try {
    const { SplashScreen } = (window as any).Capacitor.Plugins;

    if (SplashScreen) {
      // 延迟隐藏启动画面，确保内容加载完成
      setTimeout(async () => {
        await SplashScreen.hide();
        console.log('🤖 Android启动画面已隐藏');
      }, 1000);
    }
  } catch (error) {
    console.warn('Android启动画面处理失败:', error);
  }
}

/**
 * 处理Android键盘
 */
export async function handleAndroidKeyboard(): Promise<void> {
  if (!isAndroidCapacitorApp()) return;

  try {
    const { Keyboard } = (window as any).Capacitor.Plugins;

    if (Keyboard) {
      // 监听键盘显示/隐藏
      Keyboard.addListener('keyboardWillShow', (info: any) => {
        document.body.classList.add('keyboard-active');
        document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
      });

      Keyboard.addListener('keyboardWillHide', () => {
        document.body.classList.remove('keyboard-active');
        document.documentElement.style.removeProperty('--keyboard-height');
      });

      console.log('🤖 Android键盘监听已设置');
    }
  } catch (error) {
    console.warn('Android键盘处理失败:', error);
  }
}

/**
 * 初始化Android平台适配
 */
export async function initializeAndroidPlatform(): Promise<void> {
  if (!isAndroidCapacitorApp()) return;

  console.log('🤖 初始化Android平台适配...');

  // 应用样式
  applyAndroidStyles();

  // 等待Capacitor插件加载
  if ((window as any).Capacitor) {
    await handleAndroidStatusBar();
    await handleAndroidSplashScreen();
    await handleAndroidKeyboard();
  }

  console.log('🤖 Android平台适配完成');
}

/**
 * 获取Android安全区域信息
 */
export function getAndroidSafeArea(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  return {
    top: getStatusBarHeight(),
    bottom: getNavigationBarHeight(),
    left: 0,
    right: 0,
  };
}

/**
 * 检测Android设备特性
 */
export function getAndroidDeviceInfo(): {
  isAndroid: boolean;
  isCapacitor: boolean;
  isTablet: boolean;
  version: number | null;
  safeArea: ReturnType<typeof getAndroidSafeArea>;
} {
  return {
    isAndroid: isAndroidDevice(),
    isCapacitor: isCapacitorApp(),
    isTablet: isAndroidTablet(),
    version: getAndroidVersion(),
    safeArea: getAndroidSafeArea(),
  };
}
