// iOS安全区域适配工具函数

/**
 * 检测是否为iOS设备
 */
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * 检测是否在Capacitor环境中
 */
export function isCapacitorApp(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).Capacitor;
}

/**
 * 检测是否为iPhone 16 Pro
 */
export function isIPhone16Pro(): boolean {
  if (typeof window === 'undefined') return false;
  return window.screen.width === 402 && window.screen.height === 874;
}

/**
 * 应用iOS安全区域样式
 */
export function applySafeAreaStyles(): void {
  if (typeof window === 'undefined') return;
  
  const isIOS = isIOSDevice();
  const isCapacitor = isCapacitorApp();
  
  if (isIOS && isCapacitor) {
    document.body.classList.add('capacitor-ios');
    
    // iPhone 16 Pro特殊处理
    if (isIPhone16Pro()) {
      document.body.classList.add('iphone-16-pro');
    }
    
    console.log('🍎 iOS安全区域适配已应用');
  }
}

/**
 * 获取安全区域插入值
 */
export function getSafeAreaInsets(): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  if (typeof window === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const computedStyle = getComputedStyle(document.documentElement);
  
  return {
    top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top').replace('px', '')) || 0,
    right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right').replace('px', '')) || 0,
    bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom').replace('px', '')) || 0,
    left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left').replace('px', '')) || 0,
  };
}

/**
 * 初始化iOS安全区域适配
 * 应在应用启动时调用
 */
export function initIOSSafeArea(): void {
  if (typeof window === 'undefined') return;
  
  // 等待DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySafeAreaStyles);
  } else {
    applySafeAreaStyles();
  }
  
  // 监听屏幕方向变化
  window.addEventListener('orientationchange', () => {
    setTimeout(applySafeAreaStyles, 100);
  });
} 