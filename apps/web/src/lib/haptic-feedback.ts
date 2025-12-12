/**
 * 振动反馈工具模块
 * 为iOS和Android应用提供统一的振动反馈功能
 */

import { isCapacitorApp, isIOSDevice, isAndroidDevice } from './platform-detection';

// Capacitor Haptics插件接口
interface CapacitorHaptics {
  impact: (options: { style: 'light' | 'medium' | 'heavy' }) => Promise<void>;
  vibrate: (options?: { duration?: number }) => Promise<void>;
  selectionStart: () => Promise<void>;
  selectionChanged: () => Promise<void>;
  selectionEnd: () => Promise<void>;
}

interface CapacitorGlobal {
  Capacitor: {
    Plugins: {
      Haptics: CapacitorHaptics;
    };
    isPluginAvailable: (name: string) => boolean;
    isNativePlatform: () => boolean;
  };
}

// 振动反馈类型
export enum HapticFeedbackType {
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy',
  SELECTION = 'selection',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

// 振动反馈配置
interface HapticConfig {
  enabled: boolean;
  fallbackToVibrate: boolean;
  vibrationDuration: number;
}

// 默认配置
const DEFAULT_HAPTIC_CONFIG: HapticConfig = {
  enabled: true,
  fallbackToVibrate: true,
  vibrationDuration: 50, // 毫秒
};

export class HapticFeedback {
  private capacitor: CapacitorGlobal['Capacitor'] | null = null;
  private config: HapticConfig;
  private isInitialized = false;

  constructor(config: Partial<HapticConfig> = {}) {
    this.config = { ...DEFAULT_HAPTIC_CONFIG, ...config };
    this.initialize();
  }

  // 初始化振动反馈
  private initialize() {
    if (typeof window === 'undefined') {
      console.log('🔹 [Haptic] 非浏览器环境，跳过初始化');
      return;
    }

    // 检查Capacitor是否可用
    this.capacitor = (window as any).Capacitor;

    if (!this.capacitor) {
      console.log('🔹 [Haptic] Capacitor不可用，将使用Web振动API');
      this.isInitialized = true;
      return;
    }

    // 检查Haptics插件是否可用
    const isHapticsAvailable = this.capacitor.isPluginAvailable('Haptics');

    if (!isHapticsAvailable) {
      console.log('🔹 [Haptic] Haptics插件不可用，将使用Web振动API');
    } else {
      console.log(
        '🔹 [Haptic] Haptics插件可用，平台:',
        this.capacitor.isNativePlatform() ? '原生' : 'Web',
      );
    }

    this.isInitialized = true;
  }

  // 触发振动反馈
  public async trigger(type: HapticFeedbackType): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    if (!this.isInitialized) {
      this.initialize();
    }

    try {
      // 优先使用Capacitor Haptics
      if (this.capacitor && this.capacitor.isPluginAvailable('Haptics')) {
        await this.triggerCapacitorHaptic(type);
        return;
      }

      // 降级到Web振动API
      if (this.config.fallbackToVibrate) {
        await this.triggerWebVibration(type);
      }
    } catch (error) {
      console.warn('🔹 [Haptic] 振动反馈失败:', error);

      // 最后降级到Web振动
      if (this.config.fallbackToVibrate) {
        try {
          await this.triggerWebVibration(type);
        } catch (webError) {
          console.warn('🔹 [Haptic] Web振动也失败:', webError);
        }
      }
    }
  }

  // 使用Capacitor Haptics插件
  private async triggerCapacitorHaptic(type: HapticFeedbackType): Promise<void> {
    if (!this.capacitor?.Plugins?.Haptics) {
      throw new Error('Haptics插件不可用');
    }

    const haptics = this.capacitor.Plugins.Haptics;

    switch (type) {
      case HapticFeedbackType.LIGHT:
        await haptics.impact({ style: 'light' });
        break;

      case HapticFeedbackType.MEDIUM:
        await haptics.impact({ style: 'medium' });
        break;

      case HapticFeedbackType.HEAVY:
        await haptics.impact({ style: 'heavy' });
        break;

      case HapticFeedbackType.SELECTION:
        await haptics.selectionChanged();
        break;

      case HapticFeedbackType.SUCCESS:
        // iOS: 轻快的success反馈，Android: 中等强度
        if (isIOSDevice()) {
          await haptics.impact({ style: 'light' });
        } else {
          await haptics.impact({ style: 'medium' });
        }
        break;

      case HapticFeedbackType.WARNING:
        await haptics.impact({ style: 'medium' });
        break;

      case HapticFeedbackType.ERROR:
        await haptics.impact({ style: 'heavy' });
        break;

      default:
        await haptics.impact({ style: 'light' });
        break;
    }

    console.log('🔹 [Haptic] Capacitor振动反馈已触发:', type);
  }

  // 使用Web振动API
  private async triggerWebVibration(type: HapticFeedbackType): Promise<void> {
    if (!navigator.vibrate) {
      throw new Error('设备不支持振动');
    }

    let pattern: number | number[];

    switch (type) {
      case HapticFeedbackType.LIGHT:
        pattern = 30;
        break;

      case HapticFeedbackType.MEDIUM:
        pattern = 50;
        break;

      case HapticFeedbackType.HEAVY:
        pattern = 80;
        break;

      case HapticFeedbackType.SELECTION:
        pattern = 25;
        break;

      case HapticFeedbackType.SUCCESS:
        pattern = [30, 50, 30];
        break;

      case HapticFeedbackType.WARNING:
        pattern = [50, 100, 50];
        break;

      case HapticFeedbackType.ERROR:
        pattern = [100, 50, 100];
        break;

      default:
        pattern = this.config.vibrationDuration;
        break;
    }

    navigator.vibrate(pattern);
    // 日志已精简
  }

  // 便捷方法：轻度振动（用于导航和轻量交互）
  public async light(): Promise<void> {
    await this.trigger(HapticFeedbackType.LIGHT);
  }

  // 便捷方法：中度振动
  public async medium(): Promise<void> {
    await this.trigger(HapticFeedbackType.MEDIUM);
  }

  // 便捷方法：重度振动
  public async heavy(): Promise<void> {
    await this.trigger(HapticFeedbackType.HEAVY);
  }

  // 便捷方法：选择反馈
  public async selection(): Promise<void> {
    await this.trigger(HapticFeedbackType.SELECTION);
  }

  // 便捷方法：成功反馈
  public async success(): Promise<void> {
    await this.trigger(HapticFeedbackType.SUCCESS);
  }

  // 便捷方法：警告反馈
  public async warning(): Promise<void> {
    await this.trigger(HapticFeedbackType.WARNING);
  }

  // 便捷方法：错误反馈
  public async error(): Promise<void> {
    await this.trigger(HapticFeedbackType.ERROR);
  }

  // 检查振动支持情况
  public isSupported(): boolean {
    // 检查Capacitor Haptics
    if (this.capacitor && this.capacitor.isPluginAvailable('Haptics')) {
      return true;
    }

    // 检查Web振动API
    if (navigator.vibrate) {
      return true;
    }

    return false;
  }

  // 获取当前配置
  public getConfig(): HapticConfig {
    return { ...this.config };
  }

  // 更新配置
  public updateConfig(config: Partial<HapticConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('🔹 [Haptic] 配置已更新:', this.config);
  }

  // 启用/禁用振动
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log('🔹 [Haptic] 振动反馈已', enabled ? '启用' : '禁用');
  }
}

// 创建全局实例
export const hapticFeedback = new HapticFeedback();

// 初始化函数
export function initializeHapticFeedback(config?: Partial<HapticConfig>): HapticFeedback {
  if (config) {
    hapticFeedback.updateConfig(config);
  }

  console.log('🚀 [Haptic] 振动反馈已初始化');
  return hapticFeedback;
}

// 便捷函数：为特定交互类型提供预设的振动反馈
export const hapticPresets = {
  // 导航相关
  navigation: () => hapticFeedback.light(),
  backButton: () => hapticFeedback.light(),
  tabSwitch: () => hapticFeedback.light(),

  // 交互相关
  buttonTap: () => hapticFeedback.light(),
  longPress: () => hapticFeedback.medium(),
  swipeAction: () => hapticFeedback.light(),

  // 选择相关
  categorySelect: () => hapticFeedback.selection(),
  itemSelect: () => hapticFeedback.light(),
  toggleSwitch: () => hapticFeedback.selection(),

  // 表单相关
  formSubmit: () => hapticFeedback.medium(),
  validation: () => hapticFeedback.warning(),

  // 操作反馈
  success: () => hapticFeedback.success(),
  error: () => hapticFeedback.error(),
  warning: () => hapticFeedback.warning(),

  // 记账相关
  transactionTap: () => hapticFeedback.light(),
  transactionSave: () => hapticFeedback.success(),
  amountInput: () => hapticFeedback.light(),
} as const;
