/**
 * Android中文输入法兼容性工具
 * 解决Android WebView中中文输入法的兼容性问题
 */

/**
 * 检查字符串是否包含中文字符
 */
export function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

/**
 * 安全的字符串比较，兼容中文字符
 * 在Android WebView中，toLowerCase()对中文字符可能有兼容性问题
 */
export function safeStringCompare(str1: string, str2: string): boolean {
  if (!str1 || !str2) return false;
  
  // 原始字符串比较
  if (str1 === str2) return true;
  
  // 去除空格后比较
  const trimmed1 = str1.trim();
  const trimmed2 = str2.trim();
  if (trimmed1 === trimmed2) return true;
  
  // 如果包含中文，优先使用原始字符串比较
  if (containsChinese(str1) || containsChinese(str2)) {
    return trimmed1 === trimmed2;
  }
  
  // 英文字符使用toLowerCase比较
  try {
    return trimmed1.toLowerCase() === trimmed2.toLowerCase();
  } catch (error) {
    // 如果toLowerCase失败，回退到原始比较
    console.warn('toLowerCase failed, falling back to original comparison:', error);
    return trimmed1 === trimmed2;
  }
}

/**
 * 安全的字符串包含检查，兼容中文字符
 */
export function safeStringIncludes(haystack: string, needle: string): boolean {
  if (!haystack || !needle) return false;
  
  const trimmedHaystack = haystack.trim();
  const trimmedNeedle = needle.trim();
  
  // 原始字符串包含检查
  if (trimmedHaystack.includes(trimmedNeedle)) return true;
  
  // 如果包含中文，只使用原始字符串检查
  if (containsChinese(haystack) || containsChinese(needle)) {
    return trimmedHaystack.includes(trimmedNeedle);
  }
  
  // 英文字符使用toLowerCase检查
  try {
    return trimmedHaystack.toLowerCase().includes(trimmedNeedle.toLowerCase());
  } catch (error) {
    // 如果toLowerCase失败，回退到原始检查
    console.warn('toLowerCase failed in includes check, falling back:', error);
    return trimmedHaystack.includes(trimmedNeedle);
  }
}

/**
 * 标签过滤函数，兼容Android中文输入法
 */
export function filterTagsCompatible(tags: Array<{name: string}>, searchTerm: string): Array<{name: string}> {
  if (!searchTerm.trim()) return tags;
  
  return tags.filter(tag => safeStringIncludes(tag.name, searchTerm));
}

/**
 * 检查是否可以创建新标签，兼容Android中文输入法
 */
export function canCreateTagCompatible(
  tags: Array<{name: string}>, 
  searchTerm: string, 
  allowCreate: boolean = true,
  isComposing: boolean = false
): boolean {
  if (!allowCreate || !searchTerm.trim() || isComposing) {
    return false;
  }
  
  // 检查是否已存在相同名称的标签
  return !tags.some(tag => safeStringCompare(tag.name, searchTerm));
}

/**
 * 输入法事件处理器
 */
export class InputMethodHandler {
  private isComposing = false;
  private compositionCallbacks: Array<(isComposing: boolean) => void> = [];
  
  /**
   * 添加输入法状态变化回调
   */
  addCompositionCallback(callback: (isComposing: boolean) => void): void {
    this.compositionCallbacks.push(callback);
  }
  
  /**
   * 移除输入法状态变化回调
   */
  removeCompositionCallback(callback: (isComposing: boolean) => void): void {
    const index = this.compositionCallbacks.indexOf(callback);
    if (index > -1) {
      this.compositionCallbacks.splice(index, 1);
    }
  }
  
  /**
   * 处理输入法开始事件
   */
  handleCompositionStart = (): void => {
    this.isComposing = true;
    this.notifyCallbacks();
  };
  
  /**
   * 处理输入法结束事件
   */
  handleCompositionEnd = (): void => {
    this.isComposing = false;
    // 延迟通知，确保输入值已更新
    setTimeout(() => {
      this.notifyCallbacks();
    }, 0);
  };
  
  /**
   * 获取当前输入法状态
   */
  getIsComposing(): boolean {
    return this.isComposing;
  }
  
  /**
   * 通知所有回调函数
   */
  private notifyCallbacks(): void {
    this.compositionCallbacks.forEach(callback => {
      try {
        callback(this.isComposing);
      } catch (error) {
        console.error('Error in composition callback:', error);
      }
    });
  }
}

/**
 * 全局输入法处理器实例
 */
export const globalInputMethodHandler = new InputMethodHandler();

/**
 * 为输入框添加中文输入法兼容性支持
 */
export function addInputMethodSupport(
  inputElement: HTMLInputElement | HTMLTextAreaElement,
  onCompositionChange?: (isComposing: boolean) => void
): () => void {
  const handler = new InputMethodHandler();
  
  if (onCompositionChange) {
    handler.addCompositionCallback(onCompositionChange);
  }
  
  inputElement.addEventListener('compositionstart', handler.handleCompositionStart);
  inputElement.addEventListener('compositionend', handler.handleCompositionEnd);
  
  // 返回清理函数
  return () => {
    inputElement.removeEventListener('compositionstart', handler.handleCompositionStart);
    inputElement.removeEventListener('compositionend', handler.handleCompositionEnd);
    if (onCompositionChange) {
      handler.removeCompositionCallback(onCompositionChange);
    }
  };
}

/**
 * 检测是否为Android环境
 */
export function isAndroidEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  return userAgent.includes('android');
}

/**
 * 检测是否为Android Capacitor应用
 */
export function isAndroidCapacitorApp(): boolean {
  if (typeof window === 'undefined') return false;
  
  return isAndroidEnvironment() && !!(window as any).Capacitor;
}

/**
 * Android专用的输入框配置
 */
export function getAndroidInputProps(): Record<string, any> {
  if (!isAndroidEnvironment()) return {};
  
  return {
    // 防止Android自动缩放
    style: {
      fontSize: '16px',
      WebkitTextSizeAdjust: '100%',
    },
    // 禁用自动更正和建议，减少输入法冲突
    autoCorrect: 'off',
    autoCapitalize: 'off',
    spellCheck: false,
    // 确保输入法事件正确触发
    inputMode: 'text' as const,
  };
}
