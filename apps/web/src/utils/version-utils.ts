/**
 * 版本管理工具函数
 */

/**
 * 获取当前应用版本信息
 */
export function getCurrentAppVersion() {
  return {
    version: process.env.NEXT_PUBLIC_APP_VERSION || '0.5.1',
    buildNumber: parseInt(process.env.NEXT_PUBLIC_BUILD_NUMBER || '501'),
  };
}

/**
 * 获取当前平台
 * 支持开发者工具模拟设备检测
 */
export function getCurrentPlatform(): 'web' | 'ios' | 'android' {
  if (typeof window === 'undefined') return 'web';

  // 首先检查是否为 Capacitor 环境
  if ((window as any).Capacitor) {
    const capacitorPlatform = (window as any).Capacitor.getPlatform();
    if (capacitorPlatform === 'ios' || capacitorPlatform === 'android') {
      return capacitorPlatform;
    }
  }

  // 检查 User Agent (支持开发者工具模拟)
  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes('android')) {
    return 'android';
  }

  if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
    return 'ios';
  }

  return 'web';
}

/**
 * 获取平台显示名称
 */
export function getPlatformDisplayName(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'web':
      return '网页版';
    case 'ios':
      return 'iOS';
    case 'android':
      return 'Android';
    default:
      return platform;
  }
}

/**
 * 获取平台图标
 */
export function getPlatformIcon(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'web':
      return '🌐';
    case 'ios':
      return '🍎';
    case 'android':
      return '🤖';
    default:
      return '❓';
  }
}

/**
 * 比较版本号
 * @param current 当前版本码
 * @param latest 最新版本码
 * @returns 是否有更新
 */
export function hasVersionUpdate(current: number, latest: number): boolean {
  return latest > current;
}

/**
 * 格式化版本信息
 */
export function formatVersionInfo(version: string, buildNumber: number): string {
  return `${version} (${buildNumber})`;
}

/**
 * 检查是否为强制更新
 */
export function isForceUpdate(versionInfo: any): boolean {
  return versionInfo?.isForceUpdate === true;
}

/**
 * 获取更新下载链接
 */
export function getUpdateDownloadUrl(platform: string, versionInfo: any): string | null {
  switch (platform.toLowerCase()) {
    case 'ios':
      return versionInfo?.appStoreUrl || null;
    case 'android':
      return versionInfo?.downloadUrl || null;
    case 'web':
      return window.location.origin; // Web版通过刷新页面更新
    default:
      return null;
  }
}

/**
 * 获取更新按钮文本
 */
export function getUpdateButtonText(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'web':
      return '立即更新';
    case 'ios':
      return '前往App Store';
    case 'android':
      return '下载更新';
    default:
      return '立即更新';
  }
}
