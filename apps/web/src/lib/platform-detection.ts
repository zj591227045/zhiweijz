/**
 * 平台检测和样式应用工具
 * 统一处理iOS、Android、Web环境的检测和样式应用
 */

/**
 * 检测是否为iOS设备（包括iPhone、iPad、iPod）
 * 只有在真正的iOS设备上才返回true，不包括桌面浏览器的模拟
 */
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;

  // 检测User Agent
  const userAgent = navigator.userAgent;
  const isIOSUserAgent = /iPad|iPhone|iPod/.test(userAgent);

  // 排除桌面浏览器（包括开发者工具的设备模拟）
  const isDesktopBrowser = /Windows|Macintosh|Linux/.test(userAgent) && !/Mobile|Tablet/.test(userAgent);

  // 检测是否为iOS WebView或真实iOS设备
  const isRealIOSDevice = isIOSUserAgent && !isDesktopBrowser;

  // 额外检查：如果是iOS设备，应该有触摸支持
  const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return isRealIOSDevice && hasTouchSupport;
}

/**
 * 检测是否在Capacitor环境中
 */
export function isCapacitorApp(): boolean {
  if (typeof window === 'undefined') return false;
  // 检查Capacitor对象是否存在
  const hasCapacitor = !!(window as any).Capacitor;
  // 检查是否有Capacitor的特征
  const hasCapacitorPlugins = !!(window as any).CapacitorWebView || !!(window as any).Capacitor?.Plugins;
  return hasCapacitor || hasCapacitorPlugins;
}

/**
 * 检测是否为Android设备
 */
export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent;
  const isAndroidUserAgent = /Android/.test(userAgent);

  // 排除桌面浏览器（包括开发者工具的设备模拟）
  const isDesktopBrowser = /Windows|Macintosh|Linux/.test(userAgent) && !/Mobile|Tablet/.test(userAgent);

  // 只有在真正的Android设备上才返回true
  return isAndroidUserAgent && !isDesktopBrowser;
}

/**
 * 检测是否为移动设备
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent;
  const isMobileUserAgent = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  // 排除桌面浏览器（包括开发者工具的设备模拟）
  const isDesktopBrowser = /Windows|Macintosh|Linux/.test(userAgent) && !/Mobile|Tablet/.test(userAgent);

  // 只有在真正的移动设备上才返回true
  return isMobileUserAgent && !isDesktopBrowser;
}

/**
 * 检测是否为iPhone 16 Pro或类似设备（有Dynamic Island）
 */
export function hasNotch(): boolean {
  if (typeof window === 'undefined') return false;
  
  // 检测屏幕尺寸（iPhone 16 Pro: 402x874）
  const isIPhone16Pro = window.screen.width === 402 && window.screen.height === 874;
  
  // 检测是否有安全区域
  const hasSafeArea = CSS.supports('padding-top', 'env(safe-area-inset-top)');
  
  // 检测安全区域顶部是否大于0
  let topInset = 0;
  if (hasSafeArea) {
    const testElement = document.createElement('div');
    testElement.style.paddingTop = 'env(safe-area-inset-top)';
    document.body.appendChild(testElement);
    const computedStyle = getComputedStyle(testElement);
    topInset = parseInt(computedStyle.paddingTop) || 0;
    document.body.removeChild(testElement);
  }
  
  return isIPhone16Pro || (hasSafeArea && topInset > 0);
}

/**
 * 应用平台特定的CSS类名
 */
export function applyPlatformClasses(): void {
  if (typeof window === 'undefined') return;
  
  const body = document.body;
  const html = document.documentElement;
  
  // 清除之前的平台类名
  body.classList.remove('ios-app', 'android-app', 'capacitor-ios', 'capacitor-android', 'web-app');
  html.classList.remove('ios-app', 'android-app', 'capacitor-ios', 'capacitor-android', 'web-app');
  
  const isIOS = isIOSDevice();
  const isAndroid = isAndroidDevice();
  const isCapacitor = isCapacitorApp();
  const isMobile = isMobileDevice();
  
  // 应用基础平台类名
  if (isIOS) {
    body.classList.add('ios-app');
    html.classList.add('ios-app');
    console.log('🍎 iOS环境检测成功，已应用ios-app类名');
    
    if (isCapacitor) {
      body.classList.add('capacitor-ios');
      html.classList.add('capacitor-ios');
      console.log('📱 Capacitor iOS环境检测成功');
    }
    
    if (hasNotch()) {
      body.classList.add('has-notch');
      html.classList.add('has-notch');
      console.log('📱 检测到刘海屏/Dynamic Island设备');
    }
  } else if (isAndroid) {
    body.classList.add('android-app');
    html.classList.add('android-app');
    console.log('🤖 Android环境检测成功');
    
    if (isCapacitor) {
      body.classList.add('capacitor-android');
      html.classList.add('capacitor-android');
    }
  } else {
    body.classList.add('web-app');
    html.classList.add('web-app');
    console.log('🌐 Web环境检测成功');
  }
  
  // 应用移动设备类名
  if (isMobile) {
    body.classList.add('mobile-device');
    html.classList.add('mobile-device');
  }
}

/**
 * 初始化平台检测
 * 应在应用启动时调用
 */
export function initPlatformDetection(): void {
  if (typeof window === 'undefined') return;
  
  // 立即应用平台类名
  applyPlatformClasses();
  
  // 监听DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyPlatformClasses);
  }
  
  // 监听屏幕方向变化
  window.addEventListener('orientationchange', () => {
    setTimeout(applyPlatformClasses, 100);
  });
  
  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    setTimeout(applyPlatformClasses, 100);
  });
  
  console.log('🔍 平台检测初始化完成');
}

/**
 * 获取当前平台信息
 */
export function getPlatformInfo() {
  return {
    isIOS: isIOSDevice(),
    isAndroid: isAndroidDevice(),
    isCapacitor: isCapacitorApp(),
    isMobile: isMobileDevice(),
    hasNotch: hasNotch(),
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
    screenSize: typeof window !== 'undefined' ? {
      width: window.screen.width,
      height: window.screen.height
    } : null
  };
}
