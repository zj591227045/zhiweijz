/**
 * 简化的SSL状态管理
 * 避免复杂的插件初始化问题
 */

// 全局SSL状态
let globalSSLPermissive = false;

/**
 * 设置SSL宽松模式
 */
export function setSSLPermissive(enabled: boolean): void {
  globalSSLPermissive = enabled;
  console.log('🔧 [SSL状态] 设置SSL宽松模式:', enabled);
}

/**
 * 获取SSL宽松模式状态
 */
export function isSSLPermissive(): boolean {
  return globalSSLPermissive;
}

/**
 * 检查是否允许HTTP连接
 */
export function canConnectHTTP(): boolean {
  // 在Web平台总是允许
  if (typeof window !== 'undefined') {
    const platform = (window as any).Capacitor?.getPlatform?.() || 'web';
    if (platform === 'web') {
      return true;
    }
  }
  
  // 在原生平台检查SSL设置
  return globalSSLPermissive;
}

/**
 * 重置SSL状态
 */
export function resetSSLState(): void {
  globalSSLPermissive = false;
  console.log('🔧 [SSL状态] 重置SSL状态为安全模式');
}