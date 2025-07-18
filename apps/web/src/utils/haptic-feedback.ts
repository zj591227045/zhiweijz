/**
 * 统一的震动反馈工具函数
 * 支持Capacitor Haptics插件和Web Vibration API
 */

// 震动类型枚举
export enum HapticType {
  // 轻微震动 - 用于按钮点击、选择等
  LIGHT = 'light',
  // 中等震动 - 用于确认操作、状态变化等
  MEDIUM = 'medium',
  // 重度震动 - 用于重要提醒、错误等
  HEAVY = 'heavy',
  // 成功震动 - 用于操作成功
  SUCCESS = 'success',
  // 警告震动 - 用于警告提示
  WARNING = 'warning',
  // 错误震动 - 用于错误提示
  ERROR = 'error',
  // 选择震动 - 用于选择操作
  SELECTION = 'selection'
}

// 震动模式配置
interface HapticPattern {
  // Capacitor Haptics 类型
  capacitorType?: 'impact' | 'notification' | 'selection';
  capacitorStyle?: 'light' | 'medium' | 'heavy';
  capacitorNotificationType?: 'success' | 'warning' | 'error';
  // Web Vibration API 模式 (毫秒)
  webPattern: number | number[];
}

// 震动模式映射
const HAPTIC_PATTERNS: Record<HapticType, HapticPattern> = {
  [HapticType.LIGHT]: {
    capacitorType: 'impact',
    capacitorStyle: 'light',
    webPattern: 50
  },
  [HapticType.MEDIUM]: {
    capacitorType: 'impact',
    capacitorStyle: 'medium',
    webPattern: 100
  },
  [HapticType.HEAVY]: {
    capacitorType: 'impact',
    capacitorStyle: 'heavy',
    webPattern: 200
  },
  [HapticType.SUCCESS]: {
    capacitorType: 'notification',
    capacitorNotificationType: 'success',
    webPattern: [100, 50, 100]
  },
  [HapticType.WARNING]: {
    capacitorType: 'notification',
    capacitorNotificationType: 'warning',
    webPattern: [150, 100, 150]
  },
  [HapticType.ERROR]: {
    capacitorType: 'notification',
    capacitorNotificationType: 'error',
    webPattern: [200, 100, 200, 100, 200]
  },
  [HapticType.SELECTION]: {
    capacitorType: 'selection',
    webPattern: 30
  }
};

// 检测是否在Capacitor环境中
function isCapacitorEnvironment(): boolean {
  return typeof window !== 'undefined' && !!(window as any).Capacitor;
}

// 检测是否支持Capacitor Haptics
function isCapacitorHapticsAvailable(): boolean {
  if (!isCapacitorEnvironment()) return false;
  
  try {
    const capacitor = (window as any).Capacitor;
    return !!(capacitor?.Plugins?.Haptics);
  } catch {
    return false;
  }
}

// 检测是否支持Web Vibration API
function isWebVibrationAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

// 使用Capacitor Haptics执行震动
async function executeCapacitorHaptic(pattern: HapticPattern): Promise<boolean> {
  try {
    const { Haptics } = (window as any).Capacitor.Plugins;
    
    if (pattern.capacitorType === 'impact' && pattern.capacitorStyle) {
      await Haptics.impact({ style: pattern.capacitorStyle });
      return true;
    }
    
    if (pattern.capacitorType === 'notification' && pattern.capacitorNotificationType) {
      await Haptics.notification({ type: pattern.capacitorNotificationType });
      return true;
    }
    
    if (pattern.capacitorType === 'selection') {
      await Haptics.selectionStart();
      return true;
    }
    
    return false;
  } catch (error) {
    console.warn('🔊 [Haptic] Capacitor震动执行失败:', error);
    return false;
  }
}

// 使用Web Vibration API执行震动
function executeWebVibration(pattern: HapticPattern): boolean {
  try {
    if (!navigator.vibrate) return false;
    
    const success = navigator.vibrate(pattern.webPattern);
    return success;
  } catch (error) {
    console.warn('🔊 [Haptic] Web震动执行失败:', error);
    return false;
  }
}

/**
 * 执行震动反馈
 * @param type 震动类型
 * @param force 是否强制执行（忽略用户设置）
 * @returns Promise<boolean> 是否成功执行震动
 */
export async function triggerHapticFeedback(
  type: HapticType, 
  force: boolean = false
): Promise<boolean> {
  // 检查用户是否禁用了震动（可以从设置中读取）
  if (!force) {
    // TODO: 从用户设置中读取震动开关状态
    // const hapticEnabled = getUserSetting('hapticEnabled', true);
    // if (!hapticEnabled) return false;
  }
  
  const pattern = HAPTIC_PATTERNS[type];
  if (!pattern) {
    console.warn('🔊 [Haptic] 未知的震动类型:', type);
    return false;
  }
  
  console.log('🔊 [Haptic] 执行震动反馈:', type);
  
  // 优先使用Capacitor Haptics（原生体验更好）
  if (isCapacitorHapticsAvailable()) {
    console.log('🔊 [Haptic] 使用Capacitor Haptics');
    const success = await executeCapacitorHaptic(pattern);
    if (success) return true;
  }
  
  // 回退到Web Vibration API
  if (isWebVibrationAvailable()) {
    console.log('🔊 [Haptic] 使用Web Vibration API');
    return executeWebVibration(pattern);
  }
  
  console.log('🔊 [Haptic] 当前环境不支持震动反馈');
  return false;
}

/**
 * 快捷震动函数
 */
export const haptic = {
  // 轻微点击
  light: () => triggerHapticFeedback(HapticType.LIGHT),
  // 中等点击
  medium: () => triggerHapticFeedback(HapticType.MEDIUM),
  // 重度点击
  heavy: () => triggerHapticFeedback(HapticType.HEAVY),
  // 成功反馈
  success: () => triggerHapticFeedback(HapticType.SUCCESS),
  // 警告反馈
  warning: () => triggerHapticFeedback(HapticType.WARNING),
  // 错误反馈
  error: () => triggerHapticFeedback(HapticType.ERROR),
  // 选择反馈
  selection: () => triggerHapticFeedback(HapticType.SELECTION)
};

/**
 * 检查震动支持情况
 */
export function getHapticSupport(): {
  capacitor: boolean;
  web: boolean;
  supported: boolean;
} {
  const capacitor = isCapacitorHapticsAvailable();
  const web = isWebVibrationAvailable();
  
  return {
    capacitor,
    web,
    supported: capacitor || web
  };
}

/**
 * 录音相关的专用震动函数
 */
export const recordingHaptics = {
  // 开始录音
  start: () => triggerHapticFeedback(HapticType.MEDIUM),
  // 停止录音
  stop: () => triggerHapticFeedback(HapticType.LIGHT),
  // 取消录音
  cancel: () => triggerHapticFeedback(HapticType.WARNING),
  // 录音成功
  success: () => triggerHapticFeedback(HapticType.SUCCESS),
  // 录音错误
  error: () => triggerHapticFeedback(HapticType.ERROR),
  // 按钮触摸
  touch: () => triggerHapticFeedback(HapticType.LIGHT)
};
